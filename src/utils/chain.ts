import { createPublicClient, defineChain, http } from "viem";

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

export const chains = {
  youmioTestnet
}

export function findChain(id: number) {
  return Object.values(chains).find((c) => c.id === id);
}

export function getPublicClient(chainId: number, rpcUrl: string, cache = true) {
  return createPublicClient({
    chain: findChain(chainId),
    transport: http(rpcUrl),
    cacheTime: cache ? 10_000 : undefined,
  });
}