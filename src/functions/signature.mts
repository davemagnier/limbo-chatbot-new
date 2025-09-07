
import { Config, Context } from "@netlify/functions";
import { Hono } from "hono"
import { signMintMessageSignature, signTakeSignature } from "../utils/signature.ts"
import { Address, Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { bearerAuth } from 'hono/bearer-auth'
import { hashChatMessage } from "../utils/hash.ts"

const token = Netlify.env.get("BEARER_TOKEN")
const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854")
const SbtContractAddress = Netlify.env.get("SBT_CONTRACT") as Address
const SbtContractName = Netlify.env.get("SBT_CONTRACT_NAME")
const SbtContractVersion = Netlify.env.get("SBT_CONTRACT_VERSION")
const sbtAuthPrivateKey = Netlify.env.get("SBT_AUTH_PRIVATE_KEY") as Hex
const messageAuthPrivateKey = Netlify.env.get("MESSAGE_AUTH_PRIVATE_KEY") as Hex

const app = new Hono().basePath('/api/v1/signature').use('*', bearerAuth({ token }))

app.get('/', (c) => c.json({ message: 'Youmio signatures API v1' }))
app.get('/take/:walletAddress', async (c) => {
  const { walletAddress } = c.req.param()
  const signaure = await signTakeSignature({
    contractName: SbtContractName,
    contractVersion: SbtContractVersion,
    chainId: chainId,
    contractAddress: SbtContractAddress,
    from: privateKeyToAccount(sbtAuthPrivateKey),
    to: walletAddress as Address,
  })

  return c.json({ signaure, walletAddress, contract: SbtContractAddress, chainId })
})

app.get('/mint/:walletAddress', async (c) => {
  const { walletAddress } = c.req.param()
  const { tokenId, message } = c.req.query()
  const messageHash = hashChatMessage(message, walletAddress as Address);
  const signaure = await signMintMessageSignature({
    privateKey: messageAuthPrivateKey,
    contractName: SbtContractName,
    contractVersion: SbtContractVersion,
    chainId: chainId,
    contractAddress: SbtContractAddress,
    owner: walletAddress as Address,
    tokenId: BigInt(tokenId),
    message: messageHash,
  })

  return c.json({ signaure, walletAddress, contract: SbtContractAddress, chainId, tokenId, message: messageHash })

})


export default async (request: Request, context: Context) => {
  return app.fetch(request, context);
};

export const config: Config = {
  path: "/api/v1/signature/*",
};