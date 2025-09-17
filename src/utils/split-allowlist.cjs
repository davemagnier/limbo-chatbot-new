/**
 * Utility script to split a JSON allowlist file into chunks of specified size
 *
 * Usage:
 * const { splitAllowlist } = require('./split-allowlist');
 * const chunks = splitAllowlist(data, chunkSize);
 *
 * Or from command line:
 * node split-allowlist.js <input-file> <chunk-size>
 */

/**
 * Splits an allowlist array into chunks of specified size
 * @param {Object} data - The allowlist data with structure { walletAddresses: string[] }
 * @param {number} chunkSize - The maximum size of each chunk
 * @returns {Array} Array of chunked allowlist objects
 */
function splitAllowlist(data, chunkSize) {
	if (!data.walletAddresses || !Array.isArray(data.walletAddresses)) {
		throw new Error(
			"Invalid data format: expected { walletAddresses: string[] }",
		);
	}

	if (chunkSize <= 0) {
		throw new Error("Chunk size must be a positive integer");
	}

	const chunks = [];

	for (let i = 0; i < data.walletAddresses.length; i += chunkSize) {
		const chunk = data.walletAddresses.slice(i, i + chunkSize);
		chunks.push({ walletAddresses: chunk });
	}

	return chunks;
}

/**
 * Reads a JSON file and splits its allowlist into chunks
 * @param {string} filePath - Path to the JSON file
 * @param {number} chunkSize - The maximum size of each chunk
 * @returns {Promise<Array>} Promise resolving to array of chunked allowlist objects
 */
async function splitAllowlistFile(filePath, chunkSize) {
	const fs = require("fs");
	const path = require("path");

	// Validate file path
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}

	// Validate file extension
	if (path.extname(filePath) !== ".json") {
		throw new Error("File must be a JSON file");
	}

	try {
		const fileContent = fs.readFileSync(filePath, "utf8");
		const data = JSON.parse(fileContent);
		return splitAllowlist(data, chunkSize);
	} catch (error) {
		throw new Error(
			`Error parsing JSON file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Export functions for programmatic use
module.exports = {
	splitAllowlist,
	splitAllowlistFile,
};

// Command line interface
if (typeof process !== "undefined" && process.argv) {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log("Usage: node split-allowlist.js <input-file> <chunk-size>");
		console.log("Example: node split-allowlist.js allowlist.json 100");
		process.exit(1);
	}

	const inputFile = args[0];
	const chunkSize = parseInt(args[1], 10);

	if (isNaN(chunkSize) || chunkSize <= 0) {
		console.error("Chunk size must be a positive integer");
		process.exit(1);
	}

	splitAllowlistFile(inputFile, chunkSize)
		.then((chunks) => {
			console.log(`Split into ${chunks.length} chunks:`);
			chunks.forEach((chunk, index) => {
				const outputFileName = `${inputFile.replace(".json", "")}-chunk-${index + 1}.json`;
				require("fs").writeFileSync(
					outputFileName,
					JSON.stringify(chunk, null, 2),
				);
				console.log(
					`  Chunk ${index + 1}: ${chunk.walletAddresses.length} items -> ${outputFileName}`,
				);
			});
		})
		.catch((error) => {
			console.error("Error:", error.message);
			process.exit(1);
		});
}
