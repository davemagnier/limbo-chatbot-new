export const getCurrentEpoch = (): number => {
	const now = Date.now();
	return Math.floor(now / 1000);
};
