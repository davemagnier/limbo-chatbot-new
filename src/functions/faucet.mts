
import { Config, Context } from "@netlify/functions";
import { Hono } from "hono"
import { sessionAuth } from "../utils/middlewares.ts";
import { SessionData } from "../utils/auth-store.ts";
import { getWalletData, WalletData } from "../utils/allowlist-store.ts";
import { getCurrentEpoch } from "../utils/time.ts";
import { Address, Hex } from "viem";

const faucetAddress = Netlify.env.get("FAUCET_CONTRACT") as Address
const faucetPrivateKey = Netlify.env.get("FAUCET_PRIVATE_KEY") as Hex
const faucetCooldownSeconds = parseInt(Netlify.env.get("FAUCET_COOLDOWN_SECONDS") || "86400")

if (!faucetAddress || !faucetPrivateKey) {
  throw new Error("One or more required environment variables are not set");
}

type Variables = {
  session: SessionData | undefined
}

const app = new Hono<{ Variables: Variables }>().basePath('/api/v1/faucet').use('*', sessionAuth)

app.get('/cooldown', async (c) => {
  const session = c.get('session')
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const walletData: WalletData | undefined = await getWalletData(session.walletAddress)
  if (!walletData) {
    return c.json({ error: 'Wallet not in allowlist' }, 401)
  }

  const remainingCooldown = walletData.lastClaimed ? (walletData.lastClaimed + faucetCooldownSeconds) - getCurrentEpoch() : 0

  return c.json({ nextClaimIn: remainingCooldown })
})

export default async (request: Request, context: Context) => {
  return app.fetch(request, context);
};

export const config: Config = {
  path: "/api/v1/faucet/*",
};