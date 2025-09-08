import { Address } from "viem";
import { getContractInstance } from "../chain";
import { youmioSbtAbi } from "./abis/youmioSbt";

export async function getTokenOwner(tokenIndex: bigint, contractAddress: Address, chainId: number, rpcUrl: string) {
  const contract = getContractInstance(contractAddress, youmioSbtAbi, chainId, rpcUrl);

  return contract.read.ownerOf([tokenIndex]);
}