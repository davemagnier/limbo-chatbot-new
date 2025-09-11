import { Address } from "viem";
import { youtest } from "../../wagmi/chain";

// Configuration for YOUMIO Testnet
const CONFIG = {
	API_PROXY_URL: "/api/v1",
	TESTNET_CHAIN_ID: "0x10cf6",
	TESTNET_RPC_URL: youtest.rpcUrls,
	TESTNET_CHAIN_NAME: youtest.id,
	TESTNET_CURRENCY: youtest.nativeCurrency,
	TESTNET_EXPLORER: null,
	KELLS_TOKEN_ADDRESS: "0x6ACaf9E9EF556E69466362DD8086F25281beD293",
};

// State variables
let provider = null;
let signer = null;
let userAddress = null;
let tokenBalance = 0;
let claimsToday = 0;
let hasBadge = false;
let chatsMinted = 0;
let messageIdCounter = 0;
let conversationHistory = [];
const MAX_HISTORY = 20;
let isCorrectNetwork = false;
let currentMobileTab = "modules";
let authToken = null;
let userMints = [];

let termsAccepted = false;
let socialConnections = {
	x: false,
	discord: false,
};

// Chrome Extension Functions
export function openExtensionModal() {
	const modal = document.getElementById("extensionModal");
	modal.classList.add("show");
}

export function closeExtensionModal() {
	const modal = document.getElementById("extensionModal");
	modal.classList.remove("show");
}

export function copyToClipboard(text) {
	navigator.clipboard
		.writeText(text)
		.then(() => {
			showNotification("Copied to clipboard!", "success");
		})
		.catch(() => {
			// Fallback for older browsers
			const input = document.createElement("input");
			input.value = text;
			document.body.appendChild(input);
			input.select();
			document.execCommand("copy");
			document.body.removeChild(input);
			showNotification("Copied to clipboard!", "success");
		});
}

export function downloadExtension() {
	// Create a link to download your extension
	// You'll need to host the extension.zip file somewhere
	// For now, this shows an alert with instructions

	showNotification("Extension download starting...", "success");

	// Replace this URL with your actual hosted extension.zip file
	const extensionUrl = "https://your-domain.com/youmio-verify-extension.zip";

	// For demo purposes, show instructions
	alert(
		`Demo Mode: In production, this would download the extension.\n\nTo install manually:\n1. Get the extension files from the developer\n2. Unzip the files\n3. Go to chrome://extensions/\n4. Enable Developer mode\n5. Click "Load unpacked"\n6. Select the extension folder`,
	);

	// In production, uncomment this:
	// window.open(extensionUrl, '_blank');
}

// FIXED: Load admin settings helper functions
async function loadAdminSettings() {
	return {
		personality: JSON.parse(localStorage.getItem("limboPersonality") || "{}"),
		knowledge: JSON.parse(localStorage.getItem("limboKnowledge") || "{}"),
		behavior: JSON.parse(localStorage.getItem("limboBehavior") || "{}"),
		documents: JSON.parse(localStorage.getItem("limboDocuments") || "[]"),
	};
}

function extractKnowledge(settings) {
	let knowledge = "";

	// PRIORITY 1: Quick Reference Text Dump (HIGHEST PRIORITY)
	if (settings.knowledge?.textDump && settings.knowledge.textDump.trim()) {
		knowledge += "=== CRITICAL KNOWLEDGE (ALWAYS CHECK THIS FIRST) ===\n";
		knowledge += settings.knowledge.textDump.trim();
		knowledge += "\n=== END CRITICAL KNOWLEDGE ===\n\n";
	}

	// PRIORITY 2: Additional structured knowledge
	if (
		settings.knowledge?.ecosystemFacts &&
		settings.knowledge.ecosystemFacts.trim()
	) {
		knowledge += "=== ECOSYSTEM FACTS ===\n";
		knowledge += settings.knowledge.ecosystemFacts.trim();
		knowledge += "\n\n";
	}

	if (
		settings.knowledge?.importantLinks &&
		settings.knowledge.importantLinks.trim()
	) {
		knowledge += "=== IMPORTANT LINKS ===\n";
		knowledge += settings.knowledge.importantLinks.trim();
		knowledge += "\n\n";
	}

	// PRIORITY 3: Document content
	if (settings.documents && settings.documents.length > 0) {
		knowledge += "=== UPLOADED DOCUMENTS ===\n";
		settings.documents.forEach((doc) => {
			knowledge += `--- ${doc.name} ---\n`;
			knowledge += doc.content;
			knowledge += "\n\n";
		});
	}

	return knowledge || "";
}

// Generate unique reference number
function generateReferenceNumber() {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	const sessionId = window.crypto
		.getRandomValues(new Uint32Array(1))[0]
		.toString(36);
	const prefix = "LIMBO";
	return `${prefix}-${timestamp}-${random}-${sessionId}`.toUpperCase();
}

// Escape HTML for security
function escapeHtml(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Check if message is asking for image generation
function isImageRequest(message) {
	const imageKeywords = [
		"draw",
		"create",
		"generate",
		"make",
		"design",
		"paint",
		"imagine",
		"visualize",
		"picture",
		"image",
		"illustration",
		"sketch",
		"render",
		"show me",
		"can you draw",
		"make me",
		"create an image",
		"generate a picture",
		"art",
	];

	const msgLower = message.toLowerCase();

	if (/chart|price|dex|trading/i.test(msgLower)) {
		return false;
	}

	return imageKeywords.some((keyword) => msgLower.includes(keyword));
}

// Extract image prompt from user message
function extractImagePrompt(message) {
	const prefixes = [
		"draw me",
		"draw a",
		"draw an",
		"draw",
		"create me",
		"create a",
		"create an",
		"create",
		"generate me",
		"generate a",
		"generate an",
		"generate",
		"make me",
		"make a",
		"make an",
		"make",
		"imagine",
		"visualize",
		"paint",
		"design",
		"show me",
		"can you draw",
		"please draw",
		"i want an image of",
		"picture of",
		"image of",
		"create an image of",
		"generate a picture of",
	];

	let prompt = message.toLowerCase();
	for (const prefix of prefixes) {
		if (prompt.startsWith(prefix)) {
			prompt = message.substring(prefix.length).trim();
			break;
		}
	}

	if (prompt === message.toLowerCase()) {
		prompt = message;
	}

	return prompt;
}

// Generate image through Netlify Function
async function generateImage(prompt) {
	try {
		console.log("Generating image for prompt:", prompt);

		const response = await fetch(`${CONFIG.API_PROXY_URL}/image`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ prompt }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Image API error:", errorData);
			throw new Error(errorData.error || "Image API error");
		}

		const data = await response.json();
		console.log("Image data received:", data);

		if (!data.url) {
			console.error("No URL in response:", data);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Image generation error:", error);
		return null;
	}
}

// MY MINTS FUNCTIONS

// Open My Mints Modal
export function openMyMints(mints: Array<string>) {
	const modal = document.getElementById("mintsModal");
	modal.classList.add("show");

	loadUserMints(mints);
}

// Close My Mints Modal
export function closeMyMints() {
	const modal = document.getElementById("mintsModal");
	modal.classList.remove("show");
}

// Authenticate Wallet
export async function authenticateWallet() {
	if (!userAddress || !signer) {
		showNotification("Wallet not connected", "error");
		return;
	}

	const authBtn = document.querySelector(".auth-button");
	authBtn.innerHTML = '<span className="loading-spinner"></span> Signing...';
	authBtn.disabled = true;

	try {
		// Create message to sign
		const message = `Authenticate to view your minted conversations\n\nWallet: ${userAddress}\nTimestamp: ${Date.now()}\nNonce: ${Math.random()
			.toString(36)
			.substring(2)}`;

		// Request signature from wallet
		const signature = await signer.signMessage(message);

		// Send authentication request
		const response = await fetch(`${CONFIG.API_PROXY_URL}/mint-store`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				action: "authenticate",
				walletAddress: userAddress,
				signature: signature,
				message: message,
			}),
		});

		if (!response.ok) {
			throw new Error("Authentication failed");
		}

		const data = await response.json();
		authToken = data.token;

		// Store auth in session
		sessionStorage.setItem(
			`auth_${userAddress}`,
			JSON.stringify({
				token: authToken,
				expires: Date.now() + 3600000, // 1 hour
			}),
		);

		// Load user mints
		loadUserMints();
	} catch (error) {
		console.error("Authentication error:", error);
		showNotification("Authentication failed. Please try again.", "error");
		authBtn.innerHTML = "Sign & Authenticate";
		authBtn.disabled = false;
	}
}

// Load User Mints
async function loadUserMints(userMints: Array<string>) {
	// Show loading state
	document.getElementById("authContainer").style.display = "none";
	document.getElementById("mintsListContainer").style.display = "block";
	document.getElementById("mintsList").innerHTML =
		'<div style="text-align: center;"><span className="loading-spinner"></span> Loading your mints...</div>';

	displayUserMints(userMints);
}

// Display User Mints
export function displayUserMints(mints: Array<string>) {
	const mintsList = document.getElementById("mintsList");

	if (!mints || mints.length === 0) {
		mintsList.innerHTML =
			'<div style="text-align: center; color: #94969C; padding: 40px;">You haven\'t minted any conversations yet.</div>';
		return;
	}

	let html = `
                <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #94969C; font-size: 13px;">Total Mints: ${mints.length}</span>
                    <button className="export-button" onclick="exportUserMints()">Export My Mints</button>
                </div>
            `;

	mints.forEach((mint) => {
		const truncateText = (text, maxLength = 200) => {
			return text.length > maxLength
				? text.substring(0, maxLength) + "..."
				: text;
		};

		html += `</span>
        </div>
            <div className="mint-conversation">
              <div className="mint-user-msg">
                <strong>You:</strong> ${escapeHtml(truncateText(mint))}`;
	});

	mintsList.innerHTML = html;
}

// Filter Mints
export function filterMints() {
	const searchTerm = document.getElementById("mintSearch").value.toLowerCase();
	const filteredMints = userMints.filter(
		(mint) =>
			mint.referenceNumber.toLowerCase().includes(searchTerm) ||
			mint.userMessage.toLowerCase().includes(searchTerm) ||
			mint.aiResponse.toLowerCase().includes(searchTerm),
	);
	displayUserMints(filteredMints);
}

// Export User Mints
function exportUserMints() {
	if (!userMints || userMints.length === 0) {
		showNotification("No mints to export", "error");
		return;
	}

	const exportData = {
		wallet: userAddress,
		exportDate: new Date().toISOString(),
		totalMints: userMints.length,
		mints: userMints,
	};

	const blob = new Blob([JSON.stringify(exportData, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `my-mints-${userAddress.slice(0, 8)}-${Date.now()}.json`;
	a.click();

	showNotification("Mints exported successfully!", "success");
}

// FIXED: Mobile tab switching
export function switchMobileTab(tab) {
	currentMobileTab = tab;

	// Update tab buttons
	document.querySelectorAll(".mobile-tab-button").forEach((btn) => {
		btn.classList.remove("active");
	});
	event.target.closest(".mobile-tab-button").classList.add("active");

	// Show/hide content - FIXED VISIBILITY
	const modulesContent = document.getElementById("mobileModules");
	const chatWrapper = document.getElementById("chatbotWrapper");

	if (tab === "modules") {
		if (modulesContent) {
			modulesContent.classList.add("active");
			modulesContent.style.display = "block";
		}
		if (chatWrapper) {
			chatWrapper.classList.remove("active");
			chatWrapper.style.display = "none";
		}
	} else {
		if (modulesContent) {
			modulesContent.classList.remove("active");
			modulesContent.style.display = "none";
		}
		if (chatWrapper) {
			chatWrapper.classList.add("active");
			chatWrapper.style.display = "flex";
		}
	}
}

// FIXED: Setup mobile content properly
function setupMobileContent() {
	const isMobile = window.innerWidth <= 768;
	const mobileModules = document.getElementById("mobileModules");
	const desktopModules = document.getElementById("desktopModules");
	const chatWrapper = document.getElementById("chatbotWrapper");
	const mobileTabs = document.getElementById("mobileTabs");

	if (isMobile) {
		// Clone modules to mobile container if not already done
		if (
			mobileModules &&
			desktopModules &&
			mobileModules.children.length === 0
		) {
			mobileModules.innerHTML = desktopModules.innerHTML;
		}

		// Show mobile tabs
		if (mobileTabs) mobileTabs.style.display = "flex";

		// Setup initial mobile view
		if (mobileModules) {
			mobileModules.classList.add("active");
			mobileModules.style.display = "block";
		}
		if (chatWrapper) {
			chatWrapper.classList.remove("active");
			chatWrapper.style.display = "none";
		}

		// Hide desktop modules
		if (desktopModules) desktopModules.style.display = "none";
	} else {
		// Desktop view - ensure proper display
		if (desktopModules) desktopModules.style.display = "flex";
		if (chatWrapper) {
			chatWrapper.style.display = "flex";
			chatWrapper.classList.remove("active");
		}
		if (mobileModules) mobileModules.style.display = "none";
		if (mobileTabs) mobileTabs.style.display = "none";
	}
}

// Check network status periodically
async function checkNetworkStatus() {
	if (!window.ethereum || !userAddress) return;

	try {
		const chainId = await window.ethereum.request({ method: "eth_chainId" });
		const networkBtn = document.getElementById("networkButton");
		const networkLed = document.getElementById("networkLed");
		const networkText = document.getElementById("networkText");

		if (chainId === CONFIG.TESTNET_CHAIN_ID) {
			isCorrectNetwork = true;
			networkBtn.classList.add("connected");
			networkBtn.classList.remove("wrong-network");
			networkLed.classList.remove("wrong");
			networkText.textContent = "YOUMIO Testnet";
		} else {
			isCorrectNetwork = false;
			networkBtn.classList.remove("connected");
			networkBtn.classList.add("wrong-network");
			networkLed.classList.add("wrong");
			networkText.textContent = chainId;
		}
	} catch (error) {
		console.error("Network check error:", error);
	}
}

// Handle network button click
export async function handleNetworkClick() {
	if (!window.ethereum) {
		showNotification("Please install MetaMask first", "error");
		return;
	}

	if (!userAddress) {
		showNotification("Please connect your wallet first", "error");
		await connectWallet();
		return;
	}

	if (!isCorrectNetwork) {
		await addTestnetToWallet();
	} else {
		showNotification("Already connected to YOUMIO Testnet", "success");
	}
}

// Toggle wallet dropdown
export function toggleWalletDropdown() {
	const dropdown = document.getElementById("walletDropdown");
	dropdown.classList.toggle("show");

	// Update dropdown info
	document.getElementById("walletAddressFull").textContent = userAddress;
	document.getElementById("dropdownBalance").textContent = tokenBalance;
}

// Switch wallet function
export async function switchWallet() {
	const dropdown = document.getElementById("walletDropdown");
	dropdown.classList.remove("show");

	try {
		await window.ethereum.request({
			method: "wallet_requestPermissions",
			params: [
				{
					eth_accounts: {},
				},
			],
		});

		const accounts = await window.ethereum.request({
			method: "eth_requestAccounts",
		});

		if (accounts && accounts.length > 0) {
			userAddress = accounts[0];
			const walletBtn = document.getElementById("walletButton");
			const shortAddress =
				userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
			walletBtn.textContent = shortAddress;

			loadUserData();
			checkNetworkStatus();
			showNotification(`Switched to wallet: ${shortAddress}`, "success");
		}
	} catch (error) {
		console.error("Switch wallet error:", error);
		showNotification("Failed to switch wallet", "error");
	}
}

export function startOnboarding() {
	document.getElementById("onboardingStep1").style.display = "none";
	document.getElementById("onboardingStep2").style.display = "block";
	document.getElementById("step1").classList.add("active");
}

export function toggleCheckbox() {
	const checkbox = document.getElementById("termsCheckbox");
	const addBtn = document.getElementById("addNetworkBtn");

	termsAccepted = !termsAccepted;

	if (termsAccepted) {
		checkbox.classList.add("checked");
		addBtn.disabled = false;
	} else {
		checkbox.classList.remove("checked");
		addBtn.disabled = true;
	}
}

export function connectSocial(platform) {
	const button = document.getElementById(
		platform === "x" ? "connectX" : "connectDiscord",
	);

	button.innerHTML = '<span className="spinner"></span> Connecting...';
	button.disabled = true;

	setTimeout(() => {
		socialConnections[platform] = true;
		button.classList.add("connected");
		button.innerHTML =
			platform === "x"
				? '<span className="social-icon">𝕏</span><span>Connected</span>'
				: '<span className="social-icon">💬</span><span>Connected</span>';

		showNotification(
			`${
				platform === "x" ? "X" : "Discord"
			} account connected! +10 bonus tokens`,
			"success",
		);

		tokenBalance += 10;
		updateUI();
	}, 1500);
}

async function checkActualChainId() {
	try {
		const response = await fetch(CONFIG.TESTNET_RPC_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_chainId",
				params: [],
				id: 1,
			}),
		});

		const data = await response.json();
		return data.result;
	} catch (error) {
		console.error("Failed to fetch chain ID:", error);
		return null;
	}
}

export async function verifyAndAddNetwork() {
	const actualChainId = await checkActualChainId();
	if (actualChainId && actualChainId !== CONFIG.TESTNET_CHAIN_ID) {
		CONFIG.TESTNET_CHAIN_ID = actualChainId;
	}

	await addTestnetToWallet();
}

let isAddingNetwork = false;

async function addTestnetToWallet() {
	if (isAddingNetwork) {
		showNotification(
			"Network addition already in progress. Please approve in MetaMask.",
			"error",
		);
		return;
	}

	if (!window.ethereum) {
		showNotification("Please install MetaMask to continue", "error");
		return;
	}

	isAddingNetwork = true;
	const addBtn = document.getElementById("addNetworkBtn");
	const originalText = addBtn ? addBtn.innerHTML : "";
	if (addBtn) {
		addBtn.innerHTML =
			'<span className="spinner"></span> Waiting for MetaMask...';
	}

	try {
		const accounts = await window.ethereum.request({
			method: "eth_requestAccounts",
		});

		if (accounts.length === 0) {
			throw new Error("No accounts found");
		}

		if (document.getElementById("step1")) {
			document.getElementById("step1").classList.remove("active");
			document.getElementById("step1").classList.add("completed");
			document.getElementById("step2").classList.add("active");
		}

		const currentChainId = await window.ethereum.request({
			method: "eth_chainId",
		});

		if (currentChainId === CONFIG.TESTNET_CHAIN_ID) {
			if (document.getElementById("step2")) {
				document.getElementById("step2").classList.remove("active");
				document.getElementById("step2").classList.add("completed");
				document.getElementById("step3").classList.add("completed");
			}

			showNotification("Already connected to YOUMIO Testnet!", "success");
			checkNetworkStatus();

			if (
				document.getElementById("onboardingOverlay").style.display !== "none"
			) {
				setTimeout(() => {
					completeOnboarding();
				}, 1500);
			}
		} else {
			try {
				await window.ethereum.request({
					method: "wallet_switchEthereumChain",
					params: [{ chainId: CONFIG.TESTNET_CHAIN_ID }],
				});

				if (document.getElementById("step2")) {
					document.getElementById("step2").classList.remove("active");
					document.getElementById("step2").classList.add("completed");
					document.getElementById("step3").classList.add("completed");
				}

				showNotification("Switched to YOUMIO Testnet!", "success");
				checkNetworkStatus();

				if (
					document.getElementById("onboardingOverlay").style.display !== "none"
				) {
					setTimeout(() => {
						completeOnboarding();
					}, 1500);
				}
			} catch (switchError) {
				if (switchError.code === 4902) {
					try {
						await window.ethereum.request({
							method: "wallet_addEthereumChain",
							params: [
								{
									chainId: CONFIG.TESTNET_CHAIN_ID,
									chainName: CONFIG.TESTNET_CHAIN_NAME,
									nativeCurrency: CONFIG.TESTNET_CURRENCY,
									rpcUrls: [CONFIG.TESTNET_RPC_URL],
								},
							],
						});

						if (document.getElementById("step2")) {
							document.getElementById("step2").classList.remove("active");
							document.getElementById("step2").classList.add("completed");
							document.getElementById("step3").classList.add("completed");
						}

						showNotification("YOUMIO Testnet added successfully!", "success");
						checkNetworkStatus();

						if (
							document.getElementById("onboardingOverlay").style.display !==
							"none"
						) {
							setTimeout(() => {
								completeOnboarding();
							}, 1500);
						}
					} catch (addError) {
						throw addError;
					}
				} else {
					throw switchError;
				}
			}
		}
	} catch (error) {
		console.error("Network addition error:", error);
		showNotification(
			`Failed to add network: ${error.message || "Unknown error"}`,
			"error",
		);
		if (addBtn) addBtn.innerHTML = originalText;
	} finally {
		isAddingNetwork = false;
		if (addBtn) addBtn.innerHTML = originalText;
	}
}

export function skipOnboarding() {
	completeOnboarding();
}

export function completeOnboarding() {
	const overlay = document.getElementById("onboardingOverlay");
	const mainContainer = document.getElementById("mainContainer");

	overlay.style.opacity = "0";
	setTimeout(() => {
		overlay.style.display = "none";
		mainContainer.classList.add("visible");
		localStorage.setItem("onboardingCompleted", "true");

		// Ensure proper desktop/mobile setup
		setupMobileContent();
	}, 500);
}

function showNotification(message, type = "success") {
	const notification = document.createElement("div");
	notification.className = `notification ${type}`;

	const content = document.createElement("div");
	content.style.display = "flex";
	content.style.alignItems = "flex-start";
	content.style.gap = "12px";

	const textDiv = document.createElement("div");
	textDiv.style.flex = "1";

	const title = document.createElement("div");
	title.style.fontWeight = "600";
	title.style.marginBottom = "4px";
	title.textContent = type === "success" ? "Success" : "Notice";

	const msg = document.createElement("div");
	msg.style.fontSize = "14px";
	msg.style.color = "#94969C";
	msg.textContent = message;

	const closeBtn = document.createElement("button");
	closeBtn.style.background = "transparent";
	closeBtn.style.border = "none";
	closeBtn.style.color = "#94969C";
	closeBtn.style.cursor = "pointer";
	closeBtn.style.fontSize = "20px";
	closeBtn.textContent = "×";
	closeBtn.onclick = () => notification.remove();

	textDiv.appendChild(title);
	textDiv.appendChild(msg);
	content.appendChild(textDiv);
	content.appendChild(closeBtn);
	notification.appendChild(content);

	document.body.appendChild(notification);
	setTimeout(() => notification.remove(), 5000);
}

// FIXED: Connect wallet for mobile
async function connectWallet() {
	const walletBtn = document.getElementById("walletButton");

	// Check if we're on mobile and if MetaMask app is available
	const isMobile =
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent,
		);

	if (typeof window.ethereum === "undefined") {
		if (isMobile) {
			// On mobile, try to open MetaMask app
			const metamaskAppUrl = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
			showNotification("Opening MetaMask app...", "success");
			window.location.href = metamaskAppUrl;
			return;
		} else {
			showNotification(
				"MetaMask not detected. Please install MetaMask extension.",
				"error",
			);
			return;
		}
	}

	try {
		walletBtn.innerHTML = '<span className="spinner"></span> Connecting...';
		walletBtn.disabled = true;

		const accounts = await window.ethereum.request({
			method: "eth_requestAccounts",
		});

		if (accounts && accounts.length > 0) {
			provider = new ethers.providers.Web3Provider(window.ethereum);
			signer = provider.getSigner();
			userAddress = accounts[0];

			const shortAddress =
				userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
			walletBtn.textContent = shortAddress;
			walletBtn.classList.add("connected");
			walletBtn.disabled = false;

			showNotification(`Wallet connected: ${shortAddress}`, "success");
			loadUserData();
			checkNetworkStatus();

			// Set up event listeners
			window.ethereum.on("accountsChanged", (accounts) => {
				if (accounts.length === 0) {
					disconnectWallet();
				} else {
					userAddress = accounts[0];
					const shortAddr =
						userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
					walletBtn.textContent = shortAddr;
					loadUserData();
				}
			});

			window.ethereum.on("chainChanged", () => {
				checkNetworkStatus();
			});
		}
	} catch (error) {
		walletBtn.textContent = "Connect Wallet";
		walletBtn.disabled = false;

		if (error.code === 4001) {
			showNotification("Connection request rejected.", "error");
		} else {
			showNotification(
				`Connection failed: ${error.message || "Unknown error"}`,
				"error",
			);
		}
	}
}

// Modified disconnectWallet to clear auth
export function disconnectWallet() {
	// Clear authentication
	if (userAddress) {
		sessionStorage.removeItem(`auth_${userAddress}`);
	}
	authToken = null;
	userMints = [];

	// Close modal if open
	closeMyMints();

	provider = null;
	signer = null;
	userAddress = null;
	const walletBtn = document.getElementById("walletButton");
	walletBtn.textContent = "Connect Wallet";
	walletBtn.classList.remove("connected");

	const dropdown = document.getElementById("walletDropdown");
	dropdown.classList.remove("show");

	resetUI();
	showNotification("Wallet disconnected", "success");
}

function loadUserData() {
	const userData = JSON.parse(
		localStorage.getItem(`testnet_${userAddress}`) || "{}",
	);

	tokenBalance = userData.tokenBalance || 0;
	claimsToday = userData.claimsToday || 0;
	hasBadge = userData.hasBadge || false;
	chatsMinted = userData.chatsMinted || 0;

	const lastClaim = userData.lastClaimDate || "";
	const today = new Date().toDateString();
	if (lastClaim !== today) {
		claimsToday = 0;
	}

	updateUI();
}

function saveUserData() {
	const userData = {
		tokenBalance,
		claimsToday,
		hasBadge,
		chatsMinted,
		lastClaimDate: new Date().toDateString(),
	};
	localStorage.setItem(`testnet_${userAddress}`, JSON.stringify(userData));
}

function updateUI() {
	// Update all instances (desktop and mobile)
	document.querySelectorAll("#tokenBalance").forEach((el) => {
		el.textContent = tokenBalance;
	});
	document.querySelectorAll("#statTokens").forEach((el) => {
		el.textContent = `${tokenBalance} $KELLS`;
	});
	document.querySelectorAll("#claimsLeft").forEach((el) => {
		el.textContent = Math.max(0, 100 - claimsToday);
	});
	document.querySelectorAll("#statChats").forEach((el) => {
		el.textContent = chatsMinted;
	});

	document.querySelectorAll("#faucetButton").forEach((btn) => {
		if (claimsToday >= 100) {
			btn.disabled = true;
			btn.innerHTML = "<span>Daily Limit Reached</span>";
		}
	});

	if (hasBadge) {
		document.querySelectorAll("#badgeDisplayContainer").forEach((el) => {
			el.classList.remove("not-minted");
		});
		document.querySelectorAll("#badgeImage").forEach((img) => {
			img.src = "badge-minted.png";
		});
		document.querySelectorAll("#statBadge").forEach((el) => {
			el.textContent = "Minted ✅";
		});
		document.querySelectorAll("#badgeButton").forEach((btn) => {
			btn.disabled = true;
			btn.innerHTML = "<span>Badge Already Minted</span>";
		});
	}
}

function resetUI() {
	tokenBalance = 0;
	claimsToday = 0;
	hasBadge = false;
	chatsMinted = 0;
	updateUI();
}

export async function getSIWEMessage(walletAddress: Address, uri: string) {
	const response = await fetch(
		`${CONFIG.API_PROXY_URL}/auth/message/${walletAddress}?` +
			new URLSearchParams({ uri }),
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	const { authMessage } = await response.json();

	return authMessage as string;
}

export async function getSession(
	walletAddress: Address,
	signature: string,
	message: string,
) {
	const response = await fetch(
		`${CONFIG.API_PROXY_URL}/auth/session/${walletAddress}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				signature,
				message,
			}),
		},
	);

	const { sessionId } = await response.json();

	return sessionId as string;
}

export async function getTakeSignature(sessionId: string) {
	const response = await fetch(`${CONFIG.API_PROXY_URL}/signature/take`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"x-session": sessionId,
		},
	});

	const { signature, contract, from } = await response.json();

	return { signature, contract, from };
}

export async function getMintedMessages(sessionId: string) {
	const response = await fetch(`${CONFIG.API_PROXY_URL}/messages`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"x-session": sessionId,
		},
	});

	const { messages } = await response.json();

	return (messages ?? []) as string[];
}

export async function claimTokens(sessionId: string) {
	const response = await fetch(`${CONFIG.API_PROXY_URL}/faucet/claim`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-session": sessionId,
		},
	});

	const { nextClaimIn } = await response.json();

	return nextClaimIn;
}

export async function mintBadge(session: string) {
	const signature = await getTakeSignature(session);
}

async function mintChatToChain(messageData, button) {
	if (!userAddress) {
		showNotification("Please connect your wallet first", "error");
		await connectWallet();
		return;
	}

	if (!isCorrectNetwork) {
		showNotification("Please switch to YOUMIO Testnet", "error");
		await handleNetworkClick();
		return;
	}

	button.innerHTML = '<span className="spinner"></span> Minting...';
	button.disabled = true;

	try {
		// Save to database
		const response = await fetch(`${CONFIG.API_PROXY_URL}/mint-store`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...messageData,
				walletAddress: userAddress,
				tokenBalance: tokenBalance,
				networkChainId: CONFIG.TESTNET_CHAIN_ID,
				transactionHash: null,
			}),
		});

		if (!response.ok) {
			throw new Error("Failed to store mint record");
		}

		const result = await response.json();
		console.log("Mint stored with reference:", result.referenceNumber);

		setTimeout(() => {
			chatsMinted++;
			saveUserData();
			updateUI();

			button.textContent = "Minted!";
			button.classList.add("success");

			console.log(
				"✅ Minted successfully! Reference:",
				messageData.referenceNumber,
			);

			showNotification(
				`Chat minted! Ref: ${messageData.referenceNumber.slice(-8)}`,
				"success",
			);
		}, 2000);
	} catch (error) {
		console.error("Minting error:", error);
		button.textContent = "Mint Failed";
		button.disabled = false;
		showNotification("Minting failed. Please try again.", "error");
	}
}

// FIXED: Updated callAI function with knowledge extraction
async function callAI(userMessage) {
	const settings = await loadAdminSettings();
	const knowledge = extractKnowledge(settings);

	try {
		const response = await fetch(`${CONFIG.API_PROXY_URL}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				prompt: userMessage,
				knowledge: knowledge,
				personality: settings.personality,
				behavior: settings.behavior,
				conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
			}),
		});

		if (!response.ok) {
			console.error("API response not ok:", response.status);
			throw new Error("API error");
		}

		const data = await response.json();

		if (data.reply) {
			return data.reply;
		} else {
			console.error("No reply in response:", data);
			return "something's broken with the api";
		}
	} catch (error) {
		console.error("Chat error:", error);
		// Return Limbo-style error, not generic
		return "connection's being weird, try again";
	}
}

function addMessage(
	content,
	isUser = false,
	userPrompt = null,
	imageData = null,
) {
	const messageDiv = document.createElement("div");
	messageDiv.className = `message ${isUser ? "user" : "assistant"}`;
	const messageId = `msg-${++messageIdCounter}`;
	messageDiv.id = messageId;

	// Generate and store reference number for assistant messages
	let referenceNumber = null;
	if (!isUser) {
		referenceNumber = generateReferenceNumber();
		messageDiv.setAttribute("data-ref", referenceNumber);
		console.log("Message reference:", referenceNumber);
	}

	const labelDiv = document.createElement("div");
	labelDiv.className = "message-label";
	labelDiv.textContent = isUser ? "You" : "Limbo";

	const contentDiv = document.createElement("div");
	contentDiv.className = "message-content";
	contentDiv.textContent = content;

	messageDiv.appendChild(labelDiv);
	messageDiv.appendChild(contentDiv);

	// Add image if provided
	if (imageData && imageData.url && !isUser) {
		console.log("Adding image to message:", imageData.url);

		const imageContainer = document.createElement("div");
		imageContainer.className = "message-image";
		imageContainer.style.marginTop = "12px";
		imageContainer.style.borderRadius = "12px";
		imageContainer.style.overflow = "hidden";
		imageContainer.style.maxWidth = "400px";

		const img = document.createElement("img");
		img.src = imageData.url;
		img.alt = "Generated image";
		img.style.width = "100%";
		img.style.height = "auto";
		img.style.display = "block";
		img.style.cursor = "pointer";
		img.onclick = () => window.open(imageData.url, "_blank");

		// Add error handling for image loading
		img.onerror = () => {
			console.error("Failed to load image:", imageData.url);
			img.alt = "Failed to load image";
		};

		imageContainer.appendChild(img);
		messageDiv.appendChild(imageContainer);
	}

	// Add mint button with reference number
	if (!isUser && (content.length > 10 || imageData)) {
		const actionsDiv = document.createElement("div");
		actionsDiv.className = "message-actions";

		const mintBtn = document.createElement("button");
		mintBtn.className = "mint-button";
		mintBtn.textContent = imageData ? "Mint Image to Chain" : "Mint to Chain";

		mintBtn.onclick = function () {
			const mintData = {
				userMessage: userPrompt || "Direct interaction",
				aiResponse: content,
				messageId: messageId,
				referenceNumber: referenceNumber,
				imageUrl: imageData ? imageData.url : null,
				type: imageData ? "image" : "text",
			};

			mintChatToChain(mintData, mintBtn);
		};

		actionsDiv.appendChild(mintBtn);
		messageDiv.appendChild(actionsDiv);
	}

	document.getElementById("chatMessages").appendChild(messageDiv);
	document.getElementById("chatMessages").scrollTop =
		document.getElementById("chatMessages").scrollHeight;
}

function showTyping() {
	const typingDiv = document.createElement("div");
	typingDiv.className = "message typing";
	typingDiv.id = "typingIndicator";

	const dotsDiv = document.createElement("div");
	dotsDiv.className = "typing-dots";
	dotsDiv.textContent = "...";

	typingDiv.appendChild(dotsDiv);
	document.getElementById("chatMessages").appendChild(typingDiv);
	document.getElementById("chatMessages").scrollTop =
		document.getElementById("chatMessages").scrollHeight;
}

function hideTyping() {
	const typing = document.getElementById("typingIndicator");
	if (typing) typing.remove();
}

async function sendMessage() {
	const input = document.getElementById("chatInput");
	const message = input.value.trim();

	if (!message) return;

	conversationHistory.push({ role: "user", content: message });
	if (conversationHistory.length > MAX_HISTORY) {
		conversationHistory = conversationHistory.slice(-MAX_HISTORY);
	}

	addMessage(message, true);
	const userMessageText = message;
	input.value = "";
	document.getElementById("sendButton").disabled = true;

	// Check if this is an image request
	const isImage =
		isImageRequest(message) && !/chart|price|dex/i.test(message.toLowerCase());

	showTyping();

	try {
		if (isImage) {
			const imagePrompt = extractImagePrompt(message);
			console.log("Image request detected. Prompt:", imagePrompt);

			hideTyping();
			addMessage("aight, generating that for you...", false, userMessageText);
			conversationHistory.push({
				role: "assistant",
				content: "aight, generating that for you...",
			});

			showTyping();
			const imageData = await generateImage(imagePrompt);
			hideTyping();

			if (imageData && imageData.url) {
				console.log("Image generated successfully:", imageData.url);
				addMessage(
					"there you go, fresh from my digital brain",
					false,
					userMessageText,
					imageData,
				);
				conversationHistory.push({
					role: "assistant",
					content:
						"there you go, fresh from my digital brain [generated image]",
				});
			} else {
				console.error("Image generation failed - no data returned");
				addMessage(
					"image generation broke, api might be having issues",
					false,
					userMessageText,
				);
				conversationHistory.push({
					role: "assistant",
					content: "image generation broke",
				});
			}
		} else {
			const reply = await callAI(message);
			hideTyping();

			conversationHistory.push({ role: "assistant", content: reply });
			if (conversationHistory.length > MAX_HISTORY) {
				conversationHistory = conversationHistory.slice(-MAX_HISTORY);
			}

			addMessage(reply, false, userMessageText);
		}
	} catch (error) {
		console.error("Message send error:", error);
		hideTyping();
		addMessage("something broke", false, userMessageText);
	} finally {
		document.getElementById("sendButton").disabled = false;
		document.getElementById("chatInput").focus();
	}
}

// Set up periodic network check
setInterval(checkNetworkStatus, 3000);

// Handle window resize
window.addEventListener("resize", () => {
	setupMobileContent();
});

window.addEventListener("load", () => {
	const onboardingCompleted = localStorage.getItem("onboardingCompleted");
	if (onboardingCompleted === "true") {
		const mainContainer = document.getElementById("mainContainer");
		const overlay = document.getElementById("onboardingOverlay");
		overlay.style.display = "none";
		mainContainer.classList.add("visible");

		// Setup correct view based on screen size
		setupMobileContent();
	}

	// Check API status
	const apiLed = document.getElementById("apiLed");
	const apiText = document.getElementById("apiText");

	fetch(`${CONFIG.API_PROXY_URL}/health`)
		.then((response) => {
			if (response.ok) {
				apiLed.classList.remove("error");
				apiText.textContent = "API";
			} else {
				throw new Error("API offline");
			}
		})
		.catch(() => {
			apiLed.classList.add("error");
			apiText.textContent = "Offline";
		});

	// Auto-connect wallet if previously connected (for mobile)
	if (window.ethereum) {
		window.ethereum
			.request({ method: "eth_accounts" })
			.then((accounts) => {
				if (accounts && accounts.length > 0) {
					connectWallet();
				}
			})
			.catch(() => {});
	}
});

export function onMount() {
	// Close modal on escape key or background click
	document.getElementById("extensionModal").addEventListener("click", (e) => {
		if (e.target === document.getElementById("extensionModal")) {
			closeExtensionModal();
		}
	});

	// Click outside to close dropdown
	document.addEventListener("click", function (event) {
		const walletBtn = document.getElementById("walletButton");
		const dropdown = document.getElementById("walletDropdown");

		if (!walletBtn.contains(event.target) && !dropdown.contains(event.target)) {
			dropdown.classList.remove("show");
		}
	});

	// Event listeners
	document.getElementById("sendButton").addEventListener("click", sendMessage);
	document.getElementById("chatInput").addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			sendMessage();
		}
	});

	// Close modal on escape key
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			closeMyMints();
			closeExtensionModal();
		}
	});

	// Close modal on background click
	document.getElementById("mintsModal").addEventListener("click", (e) => {
		if (e.target === document.getElementById("mintsModal")) {
			closeMyMints();
		}
	});
}
