import {
  updatePersonality,
  updatePersonalityParam,
} from "../../hooks/use-personality";
import { LimboPersonality } from "../../types/admin";

// Configuration
const CONFIG = {
  API_PROXY_URL: window.location.hostname.includes("netlify.app")
    ? "/.netlify/functions"
    : window.location.hostname === "localhost"
    ? "http://localhost:8888/.netlify/functions"
    : "/.netlify/functions",
};

type LimboDocument = {
  name: string;
  content: string | ArrayBuffer | null;
  date: string;
};

let documents = JSON.parse(
  localStorage.getItem("limboDocuments") || "[]"
) as LimboDocument[];

// Secure helper function
function escapeHtml(text: string) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Mode management - FIXED
export function setMode(mode) {
  localStorage.setItem("devMode", mode === "local" ? "true" : "false");

  const localBtn = document.getElementById("localModeBtn");
  const githubBtn = document.getElementById("githubModeBtn");
  const modeStatus = document.getElementById("modeStatus");

  if (mode === "local") {
    localBtn.style.background = "rgba(255, 165, 0, 0.2)";
    localBtn.style.border = "2px solid rgba(255, 165, 0, 0.3)";
    localBtn.style.color = "#FFA500";

    githubBtn.style.background = "rgba(255, 255, 255, 0.05)";
    githubBtn.style.border = "2px solid rgba(255, 255, 255, 0.1)";
    githubBtn.style.color = "white";

    modeStatus.textContent = "Mode: Local Testing";
    modeStatus.style.background = "rgba(255, 165, 0, 0.2)";
    modeStatus.style.borderColor = "rgba(255, 165, 0, 0.3)";
    modeStatus.style.color = "#FFA500";

    showStatus("🧪 Switched to LOCAL mode - Changes affect only your testing");
  } else {
    githubBtn.style.background = "rgba(75, 191, 235, 0.2)";
    githubBtn.style.border = "2px solid rgba(75, 191, 235, 0.3)";
    githubBtn.style.color = "#4BBFEB";

    localBtn.style.background = "rgba(255, 255, 255, 0.05)";
    localBtn.style.border = "2px solid rgba(255, 255, 255, 0.1)";
    localBtn.style.color = "white";

    modeStatus.textContent = "Mode: GitHub Production";
    modeStatus.style.background = "rgba(75, 191, 235, 0.2)";
    modeStatus.style.borderColor = "rgba(75, 191, 235, 0.3)";
    modeStatus.style.color = "#4BBFEB";

    showStatus("🚀 Switched to GITHUB mode - Using production settings");
  }
}

// Initialize mode on load
function initializeMode() {
  const currentMode =
    localStorage.getItem("devMode") === "true" ? "local" : "github";
  setMode(currentMode);
}

// Tab switching
export function switchTab(tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  event.target.classList.add("active");

  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  document.getElementById(tabName + "-tab").classList.add("active");

  // Load minted conversations when switching to that tab
  if (tabName === "minted") {
    loadMintedConversations();
  }
}

function handleFiles(files: FileList) {
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const doc: LimboDocument = {
        name: file.name,
        content: e.target?.result ?? "",
        date: new Date().toISOString(),
      };
      documents.push(doc);
      localStorage.setItem("limboDocuments", JSON.stringify(documents));
      displayDocuments();
    };
    reader.readAsText(file);
  }
}

function displayDocuments() {
  const list = document.getElementById("document-list");
  if (!list) {
    return;
  }

  if (documents.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.textAlign = "center";
    emptyDiv.style.color = "#94969C";
    emptyDiv.style.padding = "20px";
    emptyDiv.textContent = "No documents uploaded";
    list.innerHTML = "";
    list.appendChild(emptyDiv);
    return;
  }

  list.innerHTML = "";
  documents.forEach((doc, i) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "document-item";

    const infoDiv = document.createElement("div");
    const nameDiv = document.createElement("div");
    nameDiv.style.fontWeight = "600";
    nameDiv.textContent = doc.name;

    const dateDiv = document.createElement("div");
    dateDiv.style.fontSize = "11px";
    dateDiv.style.color = "#94969C";
    dateDiv.textContent = new Date(doc.date).toLocaleDateString();

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(dateDiv);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => removeDocument(i);

    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(removeBtn);
    list.appendChild(itemDiv);
  });
}

function removeDocument(index: number) {
  documents.splice(index, 1);
  localStorage.setItem("limboDocuments", JSON.stringify(documents));
  displayDocuments();
}

// Apply presets
export function applyPreset(preset: string) {
  const presets: Record<string, LimboPersonality> = {
    natural: {
      awareness: 90,
      sarcasm: 75,
      helpfulness: 80,
      enthusiasm: 60,
    },
    sarcastic: {
      awareness: 70,
      sarcasm: 95,
      helpfulness: 60,
      enthusiasm: 40,
    },
    friendly: {
      awareness: 85,
      sarcasm: 40,
      helpfulness: 90,
      enthusiasm: 70,
    },
    chaotic: {
      awareness: 60,
      sarcasm: 85,
      helpfulness: 50,
      enthusiasm: 80,
    },
  };

  const tuningParams = presets[preset];
  Object.keys(tuningParams).forEach((key) => {
    setSliderValue(key, tuningParams[key as keyof LimboPersonality]);
  });

  savePersonality();
  showStatus(`Applied ${preset} preset!`);
}

function setSliderValue(id: string, value: number) {
  const slider = document.getElementById(id) as HTMLInputElement;
  if (slider) {
    slider.value = value.toString();
    const valueSpan = document.getElementById(id + "-value");
    if (valueSpan) {
      valueSpan.textContent = value + "%";
    }
    updatePersonalityParam(id, value);
  }
}

// Save functions
export function savePersonality() {
  const personality = {
    helpfulness: document.getElementById("helpfulness").value,
    enthusiasm: document.getElementById("enthusiasm").value,
    awareness: document.getElementById("awareness").value,
    sarcasm: document.getElementById("sarcasm").value,
    backstory: document.getElementById("backstory").value,
    traits: document.getElementById("traits").value,
  };

  updatePersonality(personality);

  showStatus(
    "Personality saved! Sarcasm: " +
      personality.sarcasm +
      "%, Helpfulness: " +
      personality.helpfulness +
      "%"
  );
}

export function saveKnowledge() {
  const knowledge = {
    textDump: document.getElementById("text-dump").value,
    ecosystemFacts: document.getElementById("ecosystem-facts").value,
    importantLinks: document.getElementById("important-links").value,
  };

  localStorage.setItem("limboKnowledge", JSON.stringify(knowledge));
  showStatus("Knowledge saved! The bot will use this info immediately.");
}

function saveBehavior() {
  const behavior = {
    primaryRules: document.getElementById("primary-rules").value,
    responseExamples: document.getElementById("response-examples").value,
    memoryRetention: document.getElementById("memory-retention").value,
    errorResponses: document.getElementById("error-responses").value,
  };

  localStorage.setItem("limboBehavior", JSON.stringify(behavior));
  showStatus("Behavior rules saved!");
}

function showStatus(message = "Settings saved successfully!") {
  const status = document.getElementById("status-bar");
  status.textContent = "✅ " + message;
  status.classList.add("show");
  setTimeout(() => status.classList.remove("show"), 3000);
}

// Export settings
export function exportSettings() {
  const allSettings = {
    personality: JSON.parse(localStorage.getItem("limboPersonality") || "{}"),
    knowledge: JSON.parse(localStorage.getItem("limboKnowledge") || "{}"),
    behavior: JSON.parse(localStorage.getItem("limboBehavior") || "{}"),
    documents: JSON.parse(localStorage.getItem("limboDocuments") || "[]"),
    version: "1.1",
    exported: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(allSettings, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "limbo-config.json";
  a.click();

  alert(
    "Settings exported! Upload this to your GitHub repo to update all chatbots."
  );
}

// Load minted conversations
export async function loadMintedConversations() {
  const dateFilter = document.getElementById("dateFilter").value;
  const searchQuery = document
    .getElementById("mintSearchInput")
    .value.toLowerCase();

  try {
    let url = `${CONFIG.API_PROXY_URL}/mint-store`;
    if (dateFilter) {
      url += `?date=${dateFilter}`;
    }

    const response = await fetch(
      url + (dateFilter ? "&" : "?") + "adminKey=YOUR_SECRET_ADMIN_KEY_HERE"
    );

    if (!response.ok) {
      console.log("No minted conversations found");
      return;
    }

    const data = await response.json();
    let mints = Array.isArray(data) ? data : [];

    // Filter by search query
    if (searchQuery) {
      mints = mints.filter(
        (mint) =>
          mint.referenceNumber.toLowerCase().includes(searchQuery) ||
          mint.walletAddress.toLowerCase().includes(searchQuery)
      );
    }

    // Update stats
    updateMintStats(mints);

    // Display mints
    displayMintedConversations(mints);
  } catch (error) {
    console.error("Error loading minted conversations:", error);
  }
}

function updateMintStats(mints) {
  const totalMints = mints.length;
  const today = new Date().toDateString();
  const todayMints = mints.filter(
    (m) => new Date(m.timestamp).toDateString() === today
  ).length;
  const uniqueWallets = [...new Set(mints.map((m) => m.walletAddress))].length;
  const imageMints = mints.filter((m) => m.type === "image").length;

  document.getElementById("totalMints").textContent = totalMints;
  document.getElementById("todayMints").textContent = todayMints;
  document.getElementById("uniqueWallets").textContent = uniqueWallets;
  document.getElementById("imageMints").textContent = imageMints;
}

function displayMintedConversations(mints) {
  const list = document.getElementById("mintedList");

  if (mints.length === 0) {
    list.innerHTML =
      '<div style="text-align: center; color: #94969C; padding: 40px;">No minted conversations found for the selected filters.</div>';
    return;
  }

  list.innerHTML = "";

  mints.forEach((mint) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "minted-item";

    const headerDiv = document.createElement("div");
    headerDiv.className = "minted-header";

    const refSpan = document.createElement("span");
    refSpan.className = "reference-number";
    refSpan.textContent = mint.referenceNumber;

    const timeSpan = document.createElement("span");
    timeSpan.className = "minted-time";
    timeSpan.textContent = new Date(mint.timestamp).toLocaleString();

    headerDiv.appendChild(refSpan);
    headerDiv.appendChild(timeSpan);

    const contentDiv = document.createElement("div");
    contentDiv.className = "minted-content";
    contentDiv.innerHTML = `
                    <div style="margin-bottom: 8px;"><strong>User:</strong> ${escapeHtml(
                      mint.userMessage
                    )}</div>
                    <div><strong>Limbo:</strong> ${escapeHtml(
                      mint.aiResponse.substring(0, 200)
                    )}${mint.aiResponse.length > 200 ? "..." : ""}</div>
                `;

    const metaDiv = document.createElement("div");
    metaDiv.className = "minted-meta";
    metaDiv.innerHTML = `
                    <span>Wallet: ${mint.walletAddress.slice(
                      0,
                      6
                    )}...${mint.walletAddress.slice(-4)}</span>
                    <span>Type: ${mint.type}</span>
                    ${mint.imageUrl ? "<span>Has Image</span>" : ""}
                `;

    itemDiv.appendChild(headerDiv);
    itemDiv.appendChild(contentDiv);
    itemDiv.appendChild(metaDiv);

    list.appendChild(itemDiv);
  });
}

export function refreshMintedData() {
  loadMintedConversations();
  showStatus("Minted conversations refreshed!");
}

// Load existing settings
function loadSettings() {
  const personality = JSON.parse(
    localStorage.getItem("limboPersonality") || "{}"
  );
  const knowledge = JSON.parse(localStorage.getItem("limboKnowledge") || "{}");
  const behavior = JSON.parse(localStorage.getItem("limboBehavior") || "{}");

  // Load personality settings
  Object.keys(personality).forEach((key) => {
    const element = document.getElementById(key);
    if (element) {
      element.value = personality[key];
      if (element.type === "range") {
        const valueSpan = document.getElementById(key + "-value");
        if (valueSpan) {
          valueSpan.textContent = personality[key] + "%";
        }
      }
    }
  });

  // Load knowledge settings
  Object.keys(knowledge).forEach((key) => {
    const element = document.getElementById(
      key.replace(/([A-Z])/g, "-$1").toLowerCase()
    );
    if (element) {
      element.value = knowledge[key];
    }
  });

  // Load behavior settings
  Object.keys(behavior).forEach((key) => {
    const element = document.getElementById(
      key.replace(/([A-Z])/g, "-$1").toLowerCase()
    );
    if (element) {
      element.value = behavior[key];
    }
  });

  displayDocuments();
}

// Auto-save on input
document.querySelectorAll("input, textarea, select").forEach((element) => {
  element.addEventListener("change", () => {
    const tabContent = element.closest(".tab-content");
    if (tabContent) {
      if (tabContent.id === "personality-tab") savePersonality();
      else if (tabContent.id === "knowledge-tab") saveKnowledge();
      else if (tabContent.id === "behavior-tab") saveBehavior();
    }
  });
});

export function onMount() {
  // Initialize sliders
  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener("input", function () {
      const valueSpan = document.getElementById(this.id + "-value");
      if (valueSpan) {
        valueSpan.textContent = this.value + "%";
      }
      setSliderValue(this.id, Number(this.value));
    });
  });

  // Toggle options
  document.querySelectorAll(".toggle-option").forEach((option) => {
    option.addEventListener("click", function () {
      const siblings = this.parentElement.querySelectorAll(".toggle-option");
      siblings.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // File upload
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");

  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "rgba(198, 104, 168, 0.5)";
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "rgba(198, 104, 168, 0.3)";
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "rgba(198, 104, 168, 0.3)";
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  // Search functionality
  document.getElementById("mintSearchInput").addEventListener("input", () => {
    loadMintedConversations();
  });

  // Initialize
  loadSettings();
  initializeMode();
}
