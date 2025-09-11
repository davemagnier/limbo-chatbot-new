import { youtest } from "./chain";
import { createConfig, http } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";

export const config = createConfig({
	chains: [youtest],
	transports: {
		[youtest.id]: http(),
	},
	connectors: [injected(), metaMask()],
});
