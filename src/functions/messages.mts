import { Config, Context } from "@netlify/functions";
import { Hono } from "hono";
import { SessionData } from "../utils/auth-store.ts";
import { sessionAuth } from "../utils/middlewares.ts";
import { getTokenOwner } from "../utils/contract/sbt.ts";
import { getDecryptedMessages } from "../utils/message-store.ts";
import { Address } from "viem";

const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854");
const SbtContractAddress = Netlify.env.get("SBT_CONTRACT") as Address;
const encryptionKey = Netlify.env.get("ENCRYPTION_KEY");
const rpcUrl =
	Netlify.env.get("RPC_URL") ||
	"https://subnets.avax.network/youtest/testnet/rpc";

if (!SbtContractAddress || !encryptionKey) {
	throw new Error("One or more required environment variables are not set");
}

type Variables = {
	session: SessionData | undefined;
};

const app = new Hono<{ Variables: Variables }>()
	.basePath("/api/v1/messages")
	.use("*", sessionAuth);

app.get("/", async (c) => {
	const session = c.get("session");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { tokenId } = c.req.query();
	if (tokenId === undefined) {
		return c.json({ error: "tokenId is required" }, 400);
	}
	const tokenOwner = await getTokenOwner(
		BigInt(tokenId),
		SbtContractAddress,
		chainId,
		rpcUrl,
	);
	if (tokenOwner.toLowerCase() !== session.walletAddress.toLowerCase()) {
		return c.json({ error: "Session does not own this token" }, 400);
	}

	const messages = await getDecryptedMessages(
		BigInt(tokenId),
		encryptionKey,
		SbtContractAddress,
		rpcUrl,
		chainId,
	);

	return c.json({ messages: messages.filter((m) => Boolean(m?.message)) });
});

export default async (request: Request, context: Context) => {
	return app.fetch(request, context);
};

export const config: Config = {
	path: "/api/v1/messages*",
};
