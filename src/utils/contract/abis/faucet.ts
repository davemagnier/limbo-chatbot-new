export const faucetAbi = [{
  type: "function",
  name: "mintNativeCoin",
  inputs: [
    { name: "address", type: "address", internalType: "address" },
    { name: "amount", type: "uint256", internalType: "uint256" },
  ],
  outputs: [],
  stateMutability: "nonpayable",
}] as const;
