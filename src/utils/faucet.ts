import { Address, Hex } from "viem";
import { getPublicClient, getWalletClient } from "./chain";
import { faucetAbi } from "./contract/abis/faucet";

type MintNativeArgs = {
  walletAddress: Address;
  amount: bigint;
  faucetPrivateKey: Hex;
  chainId: number;
  faucetAddress: Address;
  rpcUrl: string;
}

export async function mintNativeCoin({ walletAddress, amount, faucetPrivateKey, chainId, faucetAddress, rpcUrl }: MintNativeArgs) {
  const publicClient = getPublicClient(chainId, rpcUrl)
  const walletClient = getWalletClient(chainId, rpcUrl, faucetPrivateKey)

  const { request } = await publicClient.simulateContract({
    account: walletClient.account.address,
    address: faucetAddress,
    abi: faucetAbi,
    functionName: 'mintNativeCoin',
    args: [walletAddress, amount]
  })

  await walletClient.writeContract(request)
}