import { Address, encodePacked, Hex, keccak256 } from "viem";
import { getCurrentEpoch } from "./time";

export function hashChatMessage(message: string, address: Address): Hex {
  return keccak256(encodePacked(["address", "string", "uint256"], [address, message, BigInt(getCurrentEpoch())]));
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}