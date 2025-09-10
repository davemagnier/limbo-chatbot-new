import { Config, Context } from "@netlify/functions";
import { Hono } from "hono";

const SbtImageUrl = Netlify.env.get("SBT_IMAGE_URL");
const SbtName = Netlify.env.get("SBT_NAME") ?? "Youmio Testnet SBT";
const SbtDescription =
  Netlify.env.get("SBT_DESCRIPTION") ?? "Youmio Soulbound Token";

const app = new Hono().basePath("/api/v1/metadata");

app.get("/:tokenId", async (c) => {
  const { tokenId } = c.req.param()
  const parsedTokenId = parseInt(tokenId)
  if (Number.isNaN(parsedTokenId)) {
    return c.json({ error: 'Invalid token Id' }, 400)
  }

  const metadata = {
    description: SbtDescription,
    external_url: "https://testnet-main.netlify.app",
    image: SbtImageUrl,
    name: SbtName,
  };

  return c.json(metadata);
});

export default async (request: Request, context: Context) => {
  return app.fetch(request, context);
};

export const config: Config = {
  path: "/api/v1/metadata/*",
};
