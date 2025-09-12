import { createFileRoute } from "@tanstack/react-router";
import AdminPage from "../components/pages/AdminPage";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});
