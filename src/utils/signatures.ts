import { Hex, LocalAccount } from 'viem'
import { Address, privateKeyToAccount } from 'viem/accounts'

export const types = {
  Agreement: [
    { name: 'active', type: 'address' },
    { name: 'passive', type: 'address' },
  ],
  MintMessage: [
    { name: 'owner', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
}

type SignTakeSignatureParams = {
  contractName: string;
  contractVersion: string;
  chainId: number;
  contractAddress: Address;
  from: LocalAccount;
  to: Address;
}
export async function signTakeSignature({
  contractName,
  contractVersion,
  chainId,
  contractAddress,
  from,
  to,
}: SignTakeSignatureParams) {
  const domain = {
    name: contractName,
    version: contractVersion,
    chainId: chainId,
    verifyingContract: contractAddress,
  }

  const signature = await from.signTypedData({
    domain,
    types,
    primaryType: 'Agreement',
    message: {
      active: to,
      passive: from.address,
    },
  })

  return {
    signature,
  };
}

type SignMintMessageParams = {
  privateKey: Hex;
  contractName: string;
  contractVersion: string;
  chainId: number;
  contractAddress: Address;
  owner: Address;
  tokenId: bigint;
  message: Hex;
}
export async function signMintMessageSignature({
  privateKey,
  contractName,
  contractVersion,
  chainId,
  contractAddress,
  owner,
  tokenId,
  message,
}: SignMintMessageParams) {
  const domain = {
    name: contractName,
    version: contractVersion,
    chainId: chainId,
    verifyingContract: contractAddress,
  }

  const account = privateKeyToAccount(privateKey)

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'MintMessage',
    message: {
      owner,
      tokenId,
      message,
    },
  })

  return {
    signature,
  };
}
