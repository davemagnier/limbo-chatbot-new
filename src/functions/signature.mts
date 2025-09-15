import { Config, Context } from "@netlify/functions";
import { Hono } from "hono";
import {
	signMintMessageSignature,
	signTakeSignature,
} from "../utils/signature.ts";
import { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hashChatMessage } from "../utils/hash.ts";
import { sessionAuth } from "../utils/middlewares.ts";
import { SessionData } from "../utils/auth-store.ts";
import { encryptMessage, setMessageData } from "../utils/message-store.ts";
import { getBalance, getTokenOwner } from "../utils/contract/sbt.ts";
import { getCurrentEpoch } from "../utils/time.ts";

const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854");
const SbtContractAddress = Netlify.env.get("SBT_CONTRACT") as Address;
const SbtContractName = Netlify.env.get("SBT_CONTRACT_NAME");
const SbtContractVersion = Netlify.env.get("SBT_CONTRACT_VERSION");
const sbtAuthPrivateKey = Netlify.env.get("SBT_AUTH_PRIVATE_KEY") as Hex;
const messageAuthPrivateKey = Netlify.env.get(
	"MESSAGE_AUTH_PRIVATE_KEY",
) as Hex;
const encryptionKey = Netlify.env.get("ENCRYPTION_KEY");
const rpcUrl =
	Netlify.env.get("RPC_URL") ||
	"https://subnets.avax.network/youtest/testnet/rpc";

if (
	!SbtContractAddress ||
	!SbtContractName ||
	!SbtContractVersion ||
	!sbtAuthPrivateKey ||
	!messageAuthPrivateKey ||
	!encryptionKey ||
	!rpcUrl
) {
	throw new Error("One or more required environment variables are not set");
}

type Variables = {
	session: SessionData | undefined;
};

const app = new Hono<{ Variables: Variables }>()
	.basePath("/api/v1/signature")
	.use("*", sessionAuth);

app.get("/", (c) => c.json({ message: "Youmio signatures API v1" }));
app.get("/take", async (c) => {
	const session = c.get("session");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const balance = await getBalance(
		session.walletAddress,
		SbtContractAddress,
		chainId,
		rpcUrl,
	);
	if (balance !== 0n) {
		return c.json({ error: "Already minted SBT" }, 400);
	}

	const from = privateKeyToAccount(sbtAuthPrivateKey);

	const data = await signTakeSignature({
		contractName: SbtContractName,
		contractVersion: SbtContractVersion,
		chainId: chainId,
		contractAddress: SbtContractAddress,
		from,
		to: session.walletAddress,
	});

	return c.json({
		from: from.address,
		signature: data.signature,
		walletAddress: session.walletAddress,
		contract: SbtContractAddress,
		chainId,
	});
});

app.get("/mint", async (c) => {
	const session = c.get("session");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { tokenId, message } = c.req.query();
	if (tokenId === undefined || message === undefined) {
		return c.json({ error: "tokenId and message are required" }, 400);
	}

	const tokenOwner = await getTokenOwner(
		BigInt(tokenId),
		SbtContractAddress,
		chainId,
		rpcUrl,
	);
	if (tokenOwner.toLowerCase() !== session.walletAddress.toLowerCase()) {
		return c.json({ error: "Session does not own this token" }, 401);
	}

	const messageHash = hashChatMessage(message, session.walletAddress);
	const encryptedMessage = await encryptMessage(encryptionKey, message);
	await setMessageData(messageHash, {
		encryptedMessage: encryptedMessage.ciphertext,
		iv: encryptedMessage.iv,
		owner: session.walletAddress,
		minted: false,
		mintedAt: getCurrentEpoch(),
	});

	const { signature } = await signMintMessageSignature({
		privateKey: messageAuthPrivateKey,
		contractName: SbtContractName,
		contractVersion: SbtContractVersion,
		chainId: chainId,
		contractAddress: SbtContractAddress,
		owner: session.walletAddress,
		tokenId: BigInt(tokenId),
		message: messageHash,
	});

	return c.json({
		signature,
		walletAddress: session.walletAddress,
		contract: SbtContractAddress,
		chainId,
		tokenId,
		message: messageHash,
	});
});

export default async (request: Request, context: Context) => {
	return app.fetch(request, context);
};

export const config: Config = {
	path: "/api/v1/signature/*",
};
