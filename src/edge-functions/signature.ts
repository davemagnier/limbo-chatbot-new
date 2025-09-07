
import { Context } from "@netlify/edge-functions"
import { Hono } from "hono"
import { signMintMessageSignature, signTakeSignature } from "../utils/signatures.ts"
import { Address, Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { bearerAuth } from 'hono/bearer-auth'
import { hashChatMessage } from "../utils/hash.ts"

const token = process.env.BEARER_TOKEN
const chainId = parseInt(process.env.CHAIN_ID || '1')
const SbtContractAddress = process.env.SBT_CONTRACT as Address
const SbtContractName = process.env.SBT_CONTRACT_NAME
const SbtContractVersion = process.env.SBT_CONTRACT_VERSION
const sbtAuthPrivateKey = process.env.SBT_AUTH_PRIVATE_KEY as Hex
const messageAuthPrivateKey = process.env.MESSAGE_AUTH_PRIVATE_KEY as Hex


if (!token || !SbtContractAddress || !sbtAuthPrivateKey || !messageAuthPrivateKey || !SbtContractName || !SbtContractVersion) {
  throw new Error('Missing environment variables')
}

const app = new Hono().basePath('/api/v1/signature').use('*', bearerAuth({ token }))

app.get('/', (c) => c.json({ message: 'Hello from Hono + Netlify Edge!' }))
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

export const config = {
  path: "/api/v1/signature/*",
};