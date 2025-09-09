import { Address, zeroAddress } from "viem";
import { getContractInstance } from "../chain";
import { youmioSbtAbi } from "./abis/youmioSbt";

export async function getTokenOwner(tokenIndex: bigint, contractAddress: Address, chainId: number, rpcUrl: string) {
  const contract = getContractInstance(contractAddress, youmioSbtAbi, chainId, rpcUrl);

  // NOTE: ownerof throws error if SBT is not minted
  try {
    return contract.read.ownerOf([tokenIndex]);
  } catch (error) {
    console.log(error)
    return zeroAddress
  }
}

export async function getBalance(walletAddress: Address, contractAddress: Address, chainId: number, rpcUrl: string) {
  const contract = getContractInstance(contractAddress, youmioSbtAbi, chainId, rpcUrl);

  return contract.read.balanceOf([walletAddress]);
}