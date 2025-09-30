import { createMiddleware } from "hono/factory";
import { getSession, isSessionExpired, type SessionMetadata } from "./auth-store";
import { verifyQstashCall } from "./queue";

const currentSigningKey = Netlify.env.get("QSTASH_CURRENT_SIGNING_KEY")
const nextSigningKey = Netlify.env.get("QSTASH_NEXT_SIGNING_KEY")
if (!currentSigningKey || !nextSigningKey) {
	throw new Error("Missing Qstash environment");
}

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


export const upstashAuth = createMiddleware(async (c, next) => {
	let signature = c.req.header("Upstash-Signature");
	if (!signature) {
		signature = c.req.header("upstash-signature")
	}
	if (!signature) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const cloned = c.req.raw.clone();
	const rawBody = await cloned.text();

	try {
		const valid = await verifyQstashCall(signature, rawBody, currentSigningKey, nextSigningKey)

		if (!valid) {
			return c.json({ error: "Unauthorized. Invalid Upstash signature" }, 401);
		}
	} catch (error) {
		return c.json({ error: "Unable to decode upstash signature" }, 401);
	}

	await next();
});

