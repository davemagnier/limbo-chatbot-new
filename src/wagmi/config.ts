import { youtest } from "./chain";
import { createConfig, http } from "wagmi";

export const config = createConfig({
	chains: [youtest],
	transports: {
		[youtest.id]: http(),
	},
});
