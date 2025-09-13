import { useEffect, useState } from "react";

export async function fetchCooldown(session: string | null) {
	if (!session) {
		return { nextClaimIn: 0, error: "NO_SESSION", response: null };
	}

	return await fetch("/api/v1/faucet/cooldown", {
		headers: {
			"x-session": session,
		},
	})
		.then(async (response) => {
			const { nextClaimIn = 0, error = "" } = await response.json();
			return {
				nextClaimIn: nextClaimIn as number,
				error: error as string,
				response,
			};
		})
		.catch((response) => {
			return {
				nextClaimIn: 0,
				error: "Failed to fetch cooldown",
				response,
			};
		});
}

interface Props {
	cooldownInSeconds?: number;
	children: React.ReactElement;
}

export function FaucetCooldown({ cooldownInSeconds, children }: Props) {
	const [timer, setTimer] = useState("");

	useEffect(() => {
		if (cooldownInSeconds == null) return;

		const endTimestamp = Math.floor(Date.now() / 1000) + cooldownInSeconds;

		const interval = setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const distance = Math.max(endTimestamp - now, 0);

			const days = Math.floor(distance / (60 * 60 * 24));
			const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
			const minutes = Math.floor((distance % (60 * 60)) / 60);
			const seconds = Math.floor(distance % 60);

			setTimer(
				days > 0
					? `${days}d ${hours}h ${minutes}m ${seconds}s`
					: `${hours}h ${minutes}m ${seconds}s`,
			);

			if (distance <= 0) {
				clearInterval(interval);
				setTimer("");
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [cooldownInSeconds]);

	return <>{timer !== "" ? <span>{timer}</span> : children}</>;
}
