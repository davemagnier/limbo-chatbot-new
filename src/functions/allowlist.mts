import { Config, Context } from "@netlify/functions";
import { Hono } from "hono";
import { Address } from "viem";
import { bearerAuth } from "hono/bearer-auth";
import {
	addWallets,
	getAllowlist,
	getWalletData,
} from "../utils/allowlist-store.ts";
import { getCurrentEpoch } from "../utils/time.ts";

const adminToken = Netlify.env.get("ADMIN_TOKEN");
if (!adminToken) {
	throw new Error("One or more required environment variables are not set");
}

const app = new Hono()
	.basePath("/api/v1/allowlist")
	.use("*", bearerAuth({ token: adminToken }));

app.get("/", async (c) => {
	const allowlist = await getAllowlist();

	return c.json({ allowlist: allowlist.blobs.map((blob) => blob.key) });
});

app.get("/wallet/:walletAddress", async (c) => {
	const { walletAddress } = c.req.param();

	const data = await getWalletData(walletAddress as Address);

	return c.json({ data });
});

app.post("/wallets", async (c) => {
	const { walletAddresses } = await c.req.json();

	const data = await addWallets(walletAddresses, {
		messageCount: 0,
		faucetEnabled: true,
		lastMessageReset: getCurrentEpoch(),
	});

	return c.json({ data });
});

app.post("/wallets/:walletAddress/disableFaucet", async (c) => {
	const { walletAddress } = c.req.param();

	const walletData = await getWalletData(walletAddress as Address);
	if (!walletData) {
		return c.json({});
	}

	walletData.faucetEnabled = false;

	await addWallets([walletAddress as Address], walletData);

	return c.json({ walletData });
});

export default async (request: Request, context: Context) => {
	return app.fetch(request, context);
};

export const config: Config = {
	path: "/api/v1/allowlist*",
};
