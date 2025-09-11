// Configuration - Updated for Netlify Functions
const CONFIG = {
  // Detect if we're on Netlify or local
  API_PROXY_URL: window.location.hostname.includes("netlify.app")
    ? "/.netlify/functions"
    : window.location.hostname === "localhost"
    ? "http://localhost:8888/.netlify/functions"
    : "/.netlify/functions",
  CHAIN_ID: "0x1", // Mainnet
};

// Web3 Configuration
let provider = null;
let signer = null;
let userAddress = null;

// Track conversation with memory
let conversationHistory = [];
let messageIdCounter = 0;
const MAX_HISTORY = 20;

// Generate unique reference number - CRITICAL FOR UNIQUENESS
function generateReferenceNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sessionId = window.crypto
    .getRandomValues(new Uint32Array(1))[0]
    .toString(36);
  const prefix = "LIMBO";
  return `${prefix}-${timestamp}-${random}-${sessionId}`.toUpperCase();
}

// Initialize mode indicator
function initializeModeIndicator() {
  const modeIndicator = document.getElementById("modeIndicator");
  const isLocal = localStorage.getItem("devMode") === "true";

  if (isLocal) {
    modeIndicator.className = "mode-indicator local";
    modeIndicator.innerHTML = "<span>🧪 Local</span>";
  } else {
    modeIndicator.className = "mode-indicator github";
    modeIndicator.innerHTML = "<span>🚀 GitHub</span>";
  }
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

  // If no prefix found, use the original message
  if (prompt === message.toLowerCase()) {
    prompt = message;
  }

  return prompt;
}

// Connect MetaMask Wallet
async function connectWallet() {
  const walletBtn = document.getElementById("walletButton");

  if (typeof ethers === "undefined") {
    showNotification("Ethers.js not loaded. Please refresh the page.", "error");
    return;
  }

  if (typeof window.ethereum === "undefined") {
    showNotification(
      "MetaMask not detected. Please install MetaMask extension.",
      "error"
    );
    return;
  }

  try {
    walletBtn.innerHTML = '<span class="spinner"></span> Connecting...';
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

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          userAddress = accounts[0];
          const shortAddr =
            userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
          walletBtn.textContent = shortAddr;
        }
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
        "error"
      );
    }
  }
}

function disconnectWallet() {
  provider = null;
  signer = null;
  userAddress = null;
  const walletBtn = document.getElementById("walletButton");
  walletBtn.textContent = "Connect Wallet";
  walletBtn.classList.remove("connected");
}

// Mint message to blockchain with unique reference number
async function mintToChain(messageData, button) {
  if (!userAddress) {
    showNotification("Please connect your wallet first!", "error");
    await connectWallet();
    if (!userAddress) return null;
  }

  // Verify chain
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== CONFIG.CHAIN_ID) {
      showNotification("Please switch to the correct network", "error");
      return;
    }
  } catch (error) {
    showNotification("Chain verification failed", "error");
    return;
  }

  try {
    button.innerHTML = '<span class="spinner"></span> Minting...';
    button.disabled = true;

    // Store mint record with reference number
    const response = await fetch(`${CONFIG.API_PROXY_URL}/mint-store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...messageData,
        walletAddress: userAddress,
        tokenBalance: 0, // You can fetch actual balance if needed
        networkChainId: CONFIG.CHAIN_ID,
        transactionHash: null, // Will be updated when actual minting happens
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store mint record");
    }

    const result = await response.json();
    console.log("✅ Mint stored with reference:", result.referenceNumber);

    // Simulate successful minting
    setTimeout(() => {
      button.textContent = "Minted!";
      button.classList.add("success");
      showNotification(
        `Successfully minted! Ref: ${messageData.referenceNumber.slice(-8)}`,
        "success"
      );
    }, 2000);
  } catch (error) {
    button.textContent = "Mint to Chain";
    button.disabled = false;
    showNotification("Minting failed", "error");
    console.error("Mint error:", error);
  }
}

// Show notification (SECURE - no innerHTML)
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

// Load admin settings - COMPREHENSIVE
async function loadAdminSettings() {
  return {
    personality: JSON.parse(localStorage.getItem("limboPersonality") || "{}"),
    knowledge: JSON.parse(localStorage.getItem("limboKnowledge") || "{}"),
    behavior: JSON.parse(localStorage.getItem("limboBehavior") || "{}"),
    documents: JSON.parse(localStorage.getItem("limboDocuments") || "[]"),
  };
}

// Extract knowledge - PRIORITIZE TEXT DUMP
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

// Call AI through Netlify Function - COMPREHENSIVE
async function callAI(message) {
  const settings = await loadAdminSettings();
  const knowledge = extractKnowledge(settings);

  try {
    const response = await fetch(`${CONFIG.API_PROXY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message,
        knowledge: knowledge,
        personality: settings.personality,
        behavior: settings.behavior,
        conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
      }),
    });

    if (!response.ok) {
      console.error("API response not ok:", response.status);
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

// Generate image through Netlify Function - FIXED
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

    // Ensure we have the URL
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

// Test API connection
async function testConnection() {
  const apiLed = document.getElementById("apiLed");
  const apiText = document.getElementById("apiText");

  try {
    const response = await fetch(`${CONFIG.API_PROXY_URL}/health`);

    if (response.ok) {
      apiLed.classList.remove("error");
      apiText.textContent = "API";
    } else {
      throw new Error("API error");
    }
  } catch (error) {
    apiLed.classList.add("error");
    apiText.textContent = "API Error";
    console.error("Health check failed:", error);
  }
}

// DOM elements
let chatMessages;
let chatInput;
let sendButton;

// Add message - WITH UNIQUE REFERENCE NUMBER
function addMessage(
  content,
  isUser = false,
  userPrompt = null,
  imageData = null
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
    console.log("🔍 Message reference:", referenceNumber);
  }

  const labelDiv = document.createElement("div");
  labelDiv.className = "message-label";
  labelDiv.textContent = isUser ? "You" : "Limbo";

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = content;

  messageDiv.appendChild(labelDiv);
  messageDiv.appendChild(contentDiv);

  // Add image if provided - FIXED
  if (imageData && imageData.url && !isUser) {
    console.log("Adding image to message:", imageData.url);

    const imageContainer = document.createElement("div");
    imageContainer.className = "message-image";

    const img = document.createElement("img");
    img.src = imageData.url;
    img.alt = "Generated image";
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

  // Add mint button with unique reference number
  if (!isUser && (content.length > 10 || imageData)) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "message-actions";

    const mintBtn = document.createElement("button");
    mintBtn.className = "mint-button";
    mintBtn.textContent = imageData ? "Mint Image to Chain" : "Mint to Chain";

    mintBtn.onclick = async function () {
      const mintData = {
        userMessage: userPrompt || "Direct interaction",
        aiResponse: content,
        messageId: messageId,
        referenceNumber: referenceNumber, // Unique reference number
        imageUrl: imageData ? imageData.url : null,
        type: imageData ? "image" : "text",
      };

      await mintToChain(mintData, mintBtn);
    };

    actionsDiv.appendChild(mintBtn);
    messageDiv.appendChild(actionsDiv);
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show/hide typing
function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message typing";
  typingDiv.id = "typingIndicator";

  const dotsDiv = document.createElement("div");
  dotsDiv.className = "typing-dots";
  dotsDiv.textContent = "...";

  typingDiv.appendChild(dotsDiv);
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

// Send message - FIXED IMAGE HANDLING
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  conversationHistory.push({ role: "user", content: message });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }

  addMessage(message, true);
  const userMessageText = message;
  chatInput.value = "";
  sendButton.disabled = true;

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
          imageData
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
          userMessageText
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
    sendButton.disabled = false;
    chatInput.focus();
  }
}

export function onMount() {
  chatMessages = document.getElementById("chatMessages");
  chatInput = document.getElementById("chatInput");
  sendButton = document.getElementById("sendButton");

  // Event listeners
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  sendButton.addEventListener("click", sendMessage);
  document
    .getElementById("walletButton")
    .addEventListener("click", connectWallet);

  // Initialize
  initializeModeIndicator();
  testConnection();
  chatInput.focus();

  // Check for MetaMask on load
  window.addEventListener("load", () => {
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
}
