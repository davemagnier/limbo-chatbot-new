import type { Config, Context } from "@netlify/functions";
import { Hono } from "hono";
import type { Address, Hex } from "viem";
import {
  getWalletData,
  setWalletData,
  type WalletData,
} from "../utils/allowlist-store.ts";
import type { SessionData } from "../utils/auth-store.ts";
import { mintNativeCoin } from "../utils/faucet.ts";
import { sessionAuth, upstashAuth } from "../utils/middlewares.ts";
import { getCurrentEpoch } from "../utils/time.ts";
import { queueData } from "../utils/queue.ts";

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

const qstashToken = Netlify.env.get("QSTASH_TOKEN")
const queueName = Netlify.env.get("QSTASH_QUEUE_NAME")
const faucetWebhookUrl = Netlify.env.get("FAUCET_WEBHOOK_URL")

if (!qstashToken || !faucetWebhookUrl || !queueName) {
  throw new Error("Missing Qstash environment");
}
if (!faucetAddress || !faucetPrivateKey) {
  throw new Error("One or more required environment variables are not set");
}

type Variables = {
  session: SessionData | undefined;
};

const app = new Hono<{ Variables: Variables }>().basePath("/api/v1/faucet");

app.post("/claim", sessionAuth, async (c) => {
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

  await queueData({
    walletAddress: session.walletAddress,
  }, faucetWebhookUrl, qstashToken, queueName);

  await setWalletData(session.walletAddress, {
    ...walletData,
    lastClaimed: getCurrentEpoch(),
  });

  return c.json({ nextClaimIn: faucetCooldownSeconds });
});

app.post("/claim/process", upstashAuth, async (c) => {
  const { walletAddress } = await c.req.json();
  if (!walletAddress) {
    return c.json({ error: "Missing walletAddress" }, 400);
  }

  const walletData: WalletData | undefined = await getWalletData(
    walletAddress
  );
  if (!walletData?.faucetEnabled) {
    return c.json({ error: "Wallet not in allowlist" }, 401);
  }

  try {
    await mintNativeCoin({
      walletAddress,
      amount: faucetAmount,
      chainId,
      faucetAddress,
      faucetPrivateKey,
      rpcUrl,
    });
  } catch (error) {
    // NOTE: Reset cooldown in case of error
    await setWalletData(walletAddress, {
      ...walletData,
      lastClaimed: getCurrentEpoch() - faucetCooldownSeconds,
    });
    console.log({ error })

    return c.json({ error: "Unable to mint native token" }, 500);
  }

  return c.json({ success: true });
});

app.get("/cooldown", sessionAuth, async (c) => {
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
