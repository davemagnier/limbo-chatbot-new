import { Client, Receiver } from "@upstash/qstash";
const qstashUrl = Netlify.env.get("QSTASH_URL")

export async function queueData(data: Record<string, any>, webhookUrl: string, qstashToken: string, queueName: string) {
  const client = new Client({
    baseUrl: qstashUrl,
    token: qstashToken,
  });

  await client.queue({ queueName }).enqueue({
    url: webhookUrl,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    retries: 2
  })
}

export async function verifyQstashCall(signature: string, body: string, currentSigningKey: string, nextSigningKey: string) {
  const r = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  return await r.verify({
    signature,
    body,
  })
}