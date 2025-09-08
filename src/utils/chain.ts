import { Abi, Address, Chain, createPublicClient, defineChain, getContract, GetContractReturnType, http } from "viem";
import { sepolia } from "viem/chains";

export const youmioTestnet = defineChain({
  id: 68854,
  name: 'Youmio Testnet',
  nativeCurrency: { name: 'Youmio', symbol: 'You', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://subnets.avax.network/youtest/testnet/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Youmio Testnet Explorer',
      url: 'https://explorer-test.avax.network/youtest',
    },
  },
  testnet: true,
})

export const chains: Record<string, Chain> = {
  youmioTestnet,
  sepolia
}

export function findChain(id: number): Chain | undefined {
  return Object.values(chains).find((c) => c.id === id);
}

export function getPublicClient(chainId: number, rpcUrl: string, cache = true) {
  const chain = findChain(chainId);
  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found`);
  }
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
    cacheTime: cache ? 10_000 : undefined,
  });
}

export type GetPublicClientReturnType = ReturnType<typeof getPublicClient>;

export function getContractInstance<TAbi extends Abi>(
  contractAddress: Address,
  ABI: TAbi,
  chainId: number,
  rpcUrl: string,
): GetContractReturnType<TAbi, GetPublicClientReturnType> {
  const publicClient = getPublicClient(chainId, rpcUrl, false);

  return getContract({
    address: contractAddress,
    abi: ABI,
    client: publicClient,
  });
}