import { getStore } from "@netlify/blobs";
import { Address, Hex } from "viem";
import { getContractInstance } from "./chain";
import { youmioSbtAbi } from "./contract/abis/youmioSbt";

export type MessageData = {
	encryptedMessage: string;
	iv: string;
	owner: Address;
	minted: boolean;
	mintedAt?: number;
};

export function getMessageStore() {
	return getStore({ name: "Message" });
}

export async function getMessageData(hash: Hex) {
	const messageStore = getMessageStore();

	return await messageStore.get(hash, { type: "json" });
}

// Default expiry is 1 hour
export async function setMessageData(hash: string, data: MessageData) {
	const messageStore = getMessageStore();

	return messageStore.setJSON(hash, data);
}

export async function getDecryptedMessages(
	tokenIndex: bigint,
	encryptionKey: string,
	contractAddress: Address,
	rpcUrl: string,
	chainId: number,
) {
	const contract = getContractInstance(
		contractAddress,
		youmioSbtAbi,
		chainId,
		rpcUrl,
	);

	const messageHashes = await contract.read.getMessages([tokenIndex]);
	const store = getMessageStore();
	const messages = await Promise.all(
		messageHashes.map(async (hash: Hex) => {
			const messageData: MessageData = await store.get(hash, { type: "json" });
			if (messageData) {
				try {
					const decryptedMessage = await decryptMessage(
						encryptionKey,
						messageData.iv,
						messageData.encryptedMessage,
					);
					return {
						message: decryptedMessage,
						mintedAt: messageData.mintedAt,
					};
				} catch (error) {
					console.error("Failed to decrypt message:", {
						error,
						hash,
						messageData,
					});
					return {
						message: messageData.encryptedMessage,
						mintedAt: messageData.mintedAt,
					};
				}
			}
		}),
	);

	return messages;
}

export async function encryptMessage(
	key: string,
	message: string,
): Promise<{ iv: string; ciphertext: string }> {
	const cipher = await getKeyFromString(key);
	const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

	const encoded = new TextEncoder().encode(message);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		cipher,
		encoded,
	);

	return {
		iv: btoa(String.fromCharCode(...iv)),
		ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
	};
}

export async function decryptMessage(
	key: string,
	ivString: string,
	ciphertextString: string,
): Promise<string> {
	const cipher = await getKeyFromString(key);

	const iv = Uint8Array.from(atob(ivString), (c) => c.charCodeAt(0));
	const data = Uint8Array.from(atob(ciphertextString), (c) => c.charCodeAt(0));

	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		cipher,
		data,
	);

	return new TextDecoder().decode(decrypted);
}

async function getKeyFromString(keyStr: string): Promise<CryptoKey> {
	const raw = Uint8Array.from(atob(keyStr), (c) => c.charCodeAt(0));
	return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
		"encrypt",
		"decrypt",
	]);
}
