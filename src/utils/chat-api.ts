import { ChatRequest } from "../types/chat-request";

/**
 * Sends a chat request to the API with session authentication
 *
 * @param params - The chat request parameters
 * @param session - The authentication session ID
 * @returns The API response with the chat reply
 */
export async function sendChatRequest(
	params: ChatRequest,
	session: string,
): Promise<
	| { reply: string; remainingCooldown: number; remainingInputs: number }
	| { error: string }
> {
	try {
		const response = await fetch("/api/v1/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-session": session,
			},
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Chat API error:", errorText);
			throw new Error(`API request failed with status ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Chat request error:", error);
		return {
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

/**
 * Sends a chat request and returns only the reply text
 *
 * @param params - The chat request parameters
 * @param session - The authentication session ID
 * @returns The chat reply text or null if an error occurred
 */
export async function getChatReply(
	params: ChatRequest,
	session: string,
): Promise<string | null> {
	const result = await sendChatRequest(params, session);

	if ("error" in result) {
		console.error("Chat error:", result.error);
		return null;
	}

	return result.reply;
}

export async function getChatStatus(session: string) {
	const response = await fetch("/api/v1/chat/cooldown", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"x-session": session,
		},
	});
	if (!response.ok) {
		return { ok: false } as const;
	}
	const result = (await response.json()) as {
		remainingCooldown: number;
		remainingMessages: number;
	};
	return {
		ok: true,
		result,
	} as const;
}
