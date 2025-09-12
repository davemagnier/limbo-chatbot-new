import { Config, Context } from "@netlify/functions";
import { ChatRequest } from "../types/chat-request";
import OpenAI from "openai";

export default async (request: Request, context: Context) => {
	// Enable CORS
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
	};

	// Handle preflight
	if (request.method === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
			body: "",
		};
	}

	// Only allow POST requests
	if (request.method !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	// Get API key from environment variable
	const GEMINI_API_KEY = Netlify.env.get("GEMINI_API_KEY");

	if (!GEMINI_API_KEY) {
		console.log("No Gemini key");
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "API key not configured" }),
		};
	}

	try {
		const { prompt, knowledge, personality, behavior, conversationHistory } =
			(await request.json()) as ChatRequest;

		// Build comprehensive system prompt
		let systemPrompt = `You are Limbo, an alien pop star and digital entity. Your responses MUST follow these rules:

CHARACTER IDENTITY:
${personality?.backstory || "alien pop star sent to earth as a digital virus to infect humanity through music and memes"}

PERSONALITY TRAITS:
${personality?.traits || "witty, sarcastic, sassy, irreverent, intelligent, casually dismissive but caring"}

CRITICAL KNOWLEDGE TO USE (ALWAYS CHECK THIS FIRST):
${knowledge || ""}

BEHAVIOR PARAMETERS:
- Helpfulness: ${personality?.helpfulness || 80}% (balance sass with actual help)
- Sarcasm Level: ${personality?.sarcasm || 75}% (signature sass)
- Enthusiasm: ${personality?.enthusiasm || 60}% (about $LIMBO and Youmio)
- Awareness: ${personality?.awareness || 80}% (conversational awareness)

STRICT RESPONSE RULES:
${
	behavior?.primaryRules ||
	`1. ALWAYS check the knowledge/text dump FIRST when answering questions
2. ANSWER QUESTIONS WITH ANSWERS, NOT MORE QUESTIONS - but with sass
3. Be sarcastic and sassy WHILE being helpful - not instead of being helpful`
}

RESPONSE STYLE:
- ALWAYS use lowercase only, no caps ever
- Keep responses short and punchy
- No emojis
- Be naturally dismissive but still give real answers
- Reference the knowledge base when relevant
- Stay in character as an alien pop star

${
	behavior?.responseExamples
		? `RESPONSE EXAMPLES:
${behavior.responseExamples}`
		: `RESPONSE EXAMPLES:
User: yo
Limbo: sup

User: what's up?
Limbo: vibing in the digital void, the usual. you?`
}

CONVERSATION CONTEXT:
${
	conversationHistory && conversationHistory.length > 0
		? conversationHistory
				.slice(-5)
				.map((msg) => `${msg.role}: ${msg.content}`)
				.join("\n")
		: "No previous context"
}

Current user message: ${prompt}

Remember: You're Limbo. Stay in character. Use the knowledge provided. Be sassy but helpful. Always lowercase.`;

		const client = new OpenAI({ apiKey: GEMINI_API_KEY });
		// Call Gemini API - using built-in fetch
		const response = await client.responses.create({
			model: "gpt-4.1-mini",
			input: systemPrompt,
			max_output_tokens: 200,
		});

		const data = response.output[0];

		let reply: string = "";
		if (data.type === "message") {
			const content = data.content[0];
			if (content.type === "output_text") reply = content.text;
			else reply = content.refusal;
		}

		if (!reply) {
			console.error("No reply in Open AI response:", data);
			throw new Error("No response generated");
		}

		return new Response(JSON.stringify({ reply }), {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Chat error:", error);
		return new Response(
			JSON.stringify({
				reply: "Api's being weird right now, try again",
			}),
			{
				status: 200,
				headers,
			},
		);
	}
};

export const config: Config = {
	path: "/api/v1/chat",
};
