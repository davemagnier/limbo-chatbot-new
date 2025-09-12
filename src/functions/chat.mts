import { Config, Context } from "@netlify/functions";
import { Hono } from "hono"
import { SessionData } from "../utils/auth-store.ts";
import { sessionAuth } from "../utils/middlewares.ts";
import { buildLimboSystemPrompt } from "../utils/prompt.ts";
import OpenAI from "openai";
import { Address } from "viem";
import { getBalance } from "../utils/contract/sbt.ts";

const GEMINI_API_KEY = Netlify.env.get("GEMINI_API_KEY");
const chainId = parseInt(Netlify.env.get("CHAIN_ID") || "68854")
const SbtContractAddress = Netlify.env.get("SBT_CONTRACT") as Address
const rpcUrl = Netlify.env.get("RPC_URL") || "https://subnets.avax.network/youtest/testnet/rpc"

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not set");
}

type Variables = {
  session: SessionData | undefined
}

const app = new Hono<{ Variables: Variables }>().basePath('/api/v1/chat').use('*', sessionAuth)

app.get('/', async (c) => {
  try {
    const session = c.get('session')
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const balance = await getBalance(
      session.walletAddress,
      SbtContractAddress,
      chainId,
      rpcUrl,
    );
    if (balance == 0n) {
      return c.json({ error: "You need to mint Soulbound Badge" }, 400);
    }

    const chatRequest = await c.req.json();

    const systemPrompt = buildLimboSystemPrompt(chatRequest)
    const client = new OpenAI({ apiKey: GEMINI_API_KEY });
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
    return c.json({ reply })
  } catch (error) {
    return c.json({ reply: "Api's being weird right now, try again" })
  }
})

export default async (request: Request, context: Context) => {
  return app.fetch(request, context);
};

export const config: Config = {
  path: "/api/v1/chat*",
};