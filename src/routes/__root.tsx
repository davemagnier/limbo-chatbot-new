import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ToastContainer } from "react-toastify";
import "../index.css";
import "../toastify.css";

const RootLayout = () => (
	<>
		<Outlet />
		<ToastContainer position="bottom-right" />
		<TanStackRouterDevtools />
	</>
);

export const Route = createRootRoute({ component: RootLayout });
