import { getStore } from "@netlify/blobs";
import { Address } from "viem";
import { getCurrentEpoch } from "./time";

export type SessionData = {
  walletAddress: Address
}

export type SessionMetadata = {
  issuedAt: number
  expiresAt: number
}

export function getAuthStore() {
  return getStore({ name: "Auth" });
}

export async function getSession(sessionId: string) {
  const authStore = getAuthStore()

  return await authStore.getWithMetadata(sessionId, { type: "json" });
}

// Default expiry is 1 hour
export async function setSessionData(sessionId: string, data: SessionData, expirySeconds = 3600) {
  const authStore = getAuthStore()

  const currentEpoch = getCurrentEpoch();

  return authStore.setJSON(sessionId, data, { metadata: { issuedAt: currentEpoch, expiresAt: currentEpoch + expirySeconds } });
}

export const isSessionExpired = (metadata: SessionMetadata) => {
  const currentEpoch = getCurrentEpoch();

  return metadata.expiresAt < currentEpoch;
}