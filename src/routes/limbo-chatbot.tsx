import { createFileRoute } from "@tanstack/react-router";
import LimboChatbotPage from "../components/pages/LimboChatbot";

export const Route = createFileRoute("/limbo-chatbot")({
  component: LimboChatbotPage,
});
