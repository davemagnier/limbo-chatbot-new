import { getStore } from "@netlify/blobs";
import { Address, Hex } from "viem";
import { getContractInstance } from "./chain";
import { youmioSbtAbi } from "./contract/abis/youmioSbt";

export type MessageData = {
  encryptedMessage: string
  iv: string
  owner: Address
  minted: boolean
  mintedAt?: number
}

export function getMessageStore() {
  return getStore({ name: "Message" });
}

export async function getMessageData(hash: Hex) {
  const messageStore = getMessageStore()

  return await messageStore.get(hash, { type: "json" });
}

// Default expiry is 1 hour
export async function setMessageData(hash: string, data: MessageData) {
  const messageStore = getMessageStore()

  return messageStore.setJSON(hash, data);
}

export async function encryptMessage(
  key: string,
  message: string
): Promise<{ iv: string; ciphertext: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

export async function decryptMessage(
  key: string,
  ivBase64: string,
  ciphertextBase64: string
): Promise<string> {
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export async function getDecryptedMessages(tokenIndex: bigint, encryptionKey: string, contractAddress: Address, rpcUrl: string, chainId: number) {
  const contract = getContractInstance(contractAddress, youmioSbtAbi, chainId, rpcUrl);

  const messageHashes = await contract.read.getMessages([tokenIndex]);
  const store = getMessageStore();
  const messages = await Promise.all(messageHashes.map(async (hash: Hex) => {
    const messageData: MessageData = await store.get(hash, { type: "json" });
    if (messageData) {
      try {
        const decryptedMessage = await decryptMessage(
          encryptionKey,
          messageData.iv,
          messageData.encryptedMessage
        );
        return decryptedMessage;
      } catch (error) {
        console.error("Failed to decrypt message:", { error, hash, messageData });
        return messageData.encryptedMessage
      }
    }
  }))

  return messages
}