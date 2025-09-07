import { Address, encodePacked, Hex, keccak256 } from "viem";

export function hashChatMessage(message: string, address: Address): Hex {
  return keccak256(encodePacked(["address", "string"], [address, message]));
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}