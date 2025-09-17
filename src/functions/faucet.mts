import { Config, Context } from "@netlify/functions";
import { Hono } from "hono";
import { Address, Hex } from "viem";
import {
	getWalletData,
	setWalletData,
	WalletData,
} from "../utils/allowlist-store.ts";
import { SessionData } from "../utils/auth-store.ts";
import { mintNativeCoin } from "../utils/faucet.ts";
import { sessionAuth } from "../utils/middlewares.ts";
import { getCurrentEpoch } from "../utils/time.ts";

const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854");
const faucetAddress = Netlify.env.get("FAUCET_CONTRACT") as Address;
const faucetPrivateKey = Netlify.env.get("FAUCET_PRIVATE_KEY") as Hex;
const faucetAmount = BigInt(
	Netlify.env.get("FAUCET_AMOUNT") || "90000000000000000000",
);
const rpcUrl =
	Netlify.env.get("RPC_URL") ||
	"https://subnets.avax.network/youtest/testnet/rpc";
const faucetCooldownSeconds = parseInt(
	Netlify.env.get("FAUCET_COOLDOWN_SECONDS") || "86400",
);

if (!faucetAddress || !faucetPrivateKey) {
	throw new Error("One or more required environment variables are not set");
}

type Variables = {
	session: SessionData | undefined;
};

const app = new Hono<{ Variables: Variables }>()
	.basePath("/api/v1/faucet")
	.use("*", sessionAuth);

app.post("/claim", async (c) => {
	const session = c.get("session");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const walletData = await getWalletData(session.walletAddress);
	if (!walletData?.faucetEnabled) {
		return c.json({ error: "NOT_ALLOWLISTED" }, 401);
	}

	if (walletData.lastClaimed !== undefined) {
		const remainingCooldown =
			walletData.lastClaimed + faucetCooldownSeconds - getCurrentEpoch();
		if (remainingCooldown > 0) {
			return c.json(
				{ error: "Cannot claim", nextClaimIn: remainingCooldown },
				400,
			);
		}
	}

	const success = await mintNativeCoin({
		walletAddress: session.walletAddress,
		amount: faucetAmount,
		chainId,
		faucetAddress,
		faucetPrivateKey,
		rpcUrl,
	});

	if (!success) {
		return c.json({ error: "Failed to mint native coin" }, 500);
	}

	await setWalletData(session.walletAddress, {
		...walletData,
		lastClaimed: getCurrentEpoch(),
	});

	return c.json({ nextClaimIn: faucetCooldownSeconds });
});

app.get("/cooldown", async (c) => {
	const session = c.get("session");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const walletData: WalletData | undefined = await getWalletData(
		session.walletAddress,
	);
	if (!walletData || !walletData.faucetEnabled) {
		return c.json({ error: "NOT_ALLOWLISTED" }, 401);
	}

	const remainingCooldown = walletData.lastClaimed
		? walletData.lastClaimed + faucetCooldownSeconds - getCurrentEpoch()
		: 0;

	return c.json({ nextClaimIn: remainingCooldown });
});

export default async (request: Request, context: Context) => {
	return app.fetch(request, context);
};

export const config: Config = {
	path: "/api/v1/faucet/*",
};
