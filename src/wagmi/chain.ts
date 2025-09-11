import { defineChain } from "viem";

export const youtest = defineChain({
	id: 68854,
	name: "Youtest",
	nativeCurrency: { name: "Youtest", symbol: "YTEST", decimals: 18 },
	rpcUrls: {
		default: { http: ["https://subnets.avax.network/youtest/testnet/rpc"] },
	},
	blockExplorers: {
		default: {
			name: "Youtestscan",
			url: "https://explorer-test.avax.network/youtest",
		},
	},
});
