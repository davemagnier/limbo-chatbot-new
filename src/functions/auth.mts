
import { Config, Context } from "@netlify/functions";
import { Hono } from "hono"
import { createAuthMessage, verifyAuthSignature } from "../utils/signature.ts"
import { Address } from "viem"
import { setSessionData } from "../utils/auth-store.ts";
import { generateSessionId } from "../utils/hash.ts";
import { generateSiweNonce } from "viem/siwe";

const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854")
const domain = Netlify.env.get("DOMAIN")
const rpcUrl = Netlify.env.get("RPC_URL") || "https://subnets.avax.network/youtest/testnet/rpc"

const app = new Hono().basePath('/api/v1/auth')

app.get('/', (c) => c.json({ message: 'Youmio auth API v1' }))

app.get('/message/:walletAddress', async (c) => {
  const { walletAddress } = c.req.param()
  const { uri } = c.req.query()

  return c.json({ authMessage: createAuthMessage(walletAddress as Address, chainId, domain, uri, generateSiweNonce()) })
})

app.post('/session/:walletAddress', async (c) => {
  const { walletAddress } = c.req.param()
  const { message, signature } = await c.req.json();

  const valid = await verifyAuthSignature(walletAddress as Address, message, signature, chainId, rpcUrl)
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const sessionId = generateSessionId()

  await setSessionData(sessionId, { walletAddress: walletAddress as Address });

  return c.json({ sessionId })
})

export default async (request: Request, context: Context) => {
  return app.fetch(request, context);
};

export const config: Config = {
  path: "/api/v1/auth/*",
};