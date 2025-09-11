import { createFileRoute } from "@tanstack/react-router";
import LimboChatbot from "../components/pages/LimboChatbot";

export const Route = createFileRoute("/limbo-chatbot")({
  component: LimboChatbot,
});