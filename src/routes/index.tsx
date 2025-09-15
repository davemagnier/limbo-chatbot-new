import { createFileRoute } from "@tanstack/react-router";
import TestnetPage from "../components/pages/TestnetPage";

export const Route = createFileRoute("/")({
	component: TestnetPage,
});
