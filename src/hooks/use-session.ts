import { useLocalStorage } from "@uidotdev/usehooks";

export function useSession() {
	const [session, saveSession] = useLocalStorage<string | null>(
		"session",
		null,
	);
	return {
		session,
		saveSession,
	};
}
