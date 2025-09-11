import { createMiddleware } from "hono/factory";
import { getSession, isSessionExpired, SessionMetadata } from "./auth-store";

export const sessionAuth = createMiddleware(async (c, next) => {
	const sessionId = c.req.header("x-session");
	if (!sessionId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const session = await getSession(sessionId);
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (isSessionExpired(session.metadata as SessionMetadata)) {
		return c.json({ error: "Session expired" }, 403);
	}

	c.set("session", session.data);

	await next();
});

