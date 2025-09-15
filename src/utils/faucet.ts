import { Address, encodeFunctionData, Hex } from "viem";
import { getPublicClient, getWalletClient } from "./chain";
import { faucetAbi } from "./contract/abis/faucet";

type MintNativeArgs = {
	walletAddress: Address;
	amount: bigint;
	faucetPrivateKey: Hex;
	chainId: number;
	faucetAddress: Address;
	rpcUrl: string;
};

export async function mintNativeCoin({
	walletAddress,
	amount,
	faucetPrivateKey,
	chainId,
	faucetAddress,
	rpcUrl,
}: MintNativeArgs) {
	const publicClient = getPublicClient(chainId, rpcUrl);
	const walletClient = getWalletClient(chainId, rpcUrl, faucetPrivateKey);

	await publicClient.simulateContract({
		account: walletClient.account.address,
		address: faucetAddress,
		abi: faucetAbi,
		functionName: "mintNativeCoin",
		args: [walletAddress, amount],
	});

	const data = encodeFunctionData({
		abi: faucetAbi,
		functionName: "mintNativeCoin",
		args: [walletAddress, amount],
	});

	const hash = await walletClient.sendTransaction({
		account: walletClient.account,
		to: faucetAddress,
		data,
	});

	const receipt = await publicClient.waitForTransactionReceipt({ hash });

	return receipt.status === "success";
}
