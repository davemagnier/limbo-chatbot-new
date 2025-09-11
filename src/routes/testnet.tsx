import { createFileRoute } from "@tanstack/react-router";
import Testnet from "../components/pages/TestnetPage";

export const Route = createFileRoute("/testnet")({
  component: Testnet,
});