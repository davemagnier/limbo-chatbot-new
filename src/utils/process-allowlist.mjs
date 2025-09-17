#!/usr/bin/env node

/**
 * Script to process allowlist chunk files and make concurrent API calls
 * Usage: node process-allowlist.mjs <glob-pattern>
 */

import { glob } from "glob";
import fs from "fs/promises";
import fetch from "node-fetch";

// Get the glob pattern from command line arguments
const pattern = process.argv[2];

if (!pattern) {
	console.error("Usage: node process-allowlist.mjs <glob-pattern>");
	console.error(
		'Example: node process-allowlist.mjs "allowlist-synergy-chunk-*.json"',
	);
	process.exit(1);
}

// Get API configuration from environment variables
const API_URL =
	process.env.ALLOWLIST_API_URL ||
	"http://localhost:8000/api/v1/allowlist/wallets";
const API_TOKEN = process.env.ADMIN_TOKEN;

if (!API_TOKEN) {
	console.error("ADMIN_TOKEN environment variable is required");
	process.exit(1);
}

/**
 * Process files in batches
 * @param {Array} files - Array of file paths
 * @param {number} batchSize - Size of each batch
 */
async function processFilesInBatches(files, batchSize = 5) {
	console.log(`Processing ${files.length} files in batches of ${batchSize}`);

	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);
		console.log(
			`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`,
		);

		// Process batch concurrently
		const promises = batch.map((file) => processFile(file));
		const results = await Promise.allSettled(promises);

		// Log results
		results.forEach((result, index) => {
			const fileName = batch[index];
			if (result.status === "fulfilled") {
				console.log(`  ✓ ${fileName}: ${result.value}`);
			} else {
				console.error(`  ✗ ${fileName}: ${result.reason}`);
			}
		});
	}
}

/**
 * Process a single file
 * @param {string} filePath - Path to the JSON file
 */
async function processFile(filePath) {
	try {
		// Read and parse the JSON file
		const content = await fs.readFile(filePath, "utf8");
		const data = JSON.parse(content);

		if (!data.walletAddresses || !Array.isArray(data.walletAddresses)) {
			throw new Error("Invalid file format: missing walletAddresses array");
		}

		// Make API call
		const response = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${API_TOKEN}`,
			},
			body: JSON.stringify({
				walletAddresses: data.walletAddresses,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`API request failed with status ${response.status}: ${errorText}`,
			);
		}

		const result = await response.json();
		return `Successfully processed ${data.walletAddresses.length} wallet addresses`;
	} catch (error) {
		throw new Error(`Failed to process ${filePath}: ${error.message}`);
	}
}

/**
 * Main execution function
 */
async function main() {
	try {
		console.log(`Searching for files matching pattern: ${pattern}`);

		// Find files matching the glob pattern
		const files = await glob(pattern);

		if (files.length === 0) {
			console.log("No files found matching the pattern");
			return;
		}

		console.log(`Found ${files.length} files`);

		// Process files in batches
		await processFilesInBatches(files);

		console.log("\nAll files processed successfully!");
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

// Run the script
main();
