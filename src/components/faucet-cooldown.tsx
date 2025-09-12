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
      const { nextClaimIn, response } = await fetchCooldown(session);

      return nextClaimIn;
    },
    queryKey: [session, "cooldown"],
  });
  const [timer, setTimer] = useState("");

  useEffect(() => {
    // Update the count down every 1 second
    const timer = setInterval(() => {
      // Get today's date and time
      const now = Date.now() / 1000;

      // Find the distance between now and the count down date
      const distance = (cooldownInSeconds ?? now) - now;

      // Time calculations for days, hours, minutes and seconds
      const days = Math.floor(distance / (60 * 60 * 24));
      const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((distance % (60 * 60)) / 60);
      const seconds = Math.floor(distance % 60);

      // Display the result in the element with id="demo"
      setTimer(days + "d " + hours + "h " + minutes + "m " + seconds + "s ");

      // If the count down is finished, write some text
      if (distance <= 0) {
        clearInterval(timer);
        setTimer("");
      }
    }, 1000);
    return () => clearInterval(timer);
  });

  return <>{timer !== "" ? <span>{timer}</span> : children}</>;
}
