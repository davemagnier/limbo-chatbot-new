import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";

export async function fetchCooldown(session: string | null) {
  if (!session) return { nextClaimIn: 0 };
  const response = await fetch("/api/v1/faucet/cooldown", {
    headers: {
      "x-session": session,
    },
  });
  if (!response.ok) {
    return { nextClaimIn: 0, response };
  }
  const { nextClaimIn } = await response.json();
  return { nextClaimIn: nextClaimIn as number, response };
}

interface Props {
  children: React.ReactElement;
}

export function FaucetCooldown({ children }: Props) {
  const { session } = useSession();
  const { data: cooldownInSeconds } = useQuery({
    queryFn: async () => {
      const { nextClaimIn } = await fetchCooldown(session);
      return nextClaimIn;
    },
    queryKey: [session, "cooldown"],
  });

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
          : `${hours}h ${minutes}m ${seconds}s`
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
