import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePersonality } from "../../hooks/use-personality";
import {
  applyPreset,
  exportSettings,
  loadMintedConversations,
  onMount,
  refreshMintedData,
  saveKnowledge,
  savePersonality,
  setMode,
  switchTab,
} from "./admin";
import "./admin.css";

export default function AdminPage() {
  return <>Nothing to see here.</>;
}

function AdminPage__disabled() {
  useEffect(() => {
    console.log("In chatbot");
    onMount();
  }, []);

  const { personality } = usePersonality();

  return (
    <>
      <Link to="/" className="back-link">
        ← Back to Home
      </Link>

      <div className="container">
        <div className="header">
          <img src="youmio-logo.png" alt="Youmio" className="youmio-logo" />
          <h1>Limbo Control Center</h1>
          <p>
            Configure personality, knowledge, and behavior for all chatbot
            instances
          </p>
        </div>

        <div className="mode-controls">
          <button
            className="mode-button"
            id="localModeBtn"
            onClick={() => setMode("local")}
          >
            🧪 Local Testing
          </button>
          <button
            className="mode-button"
            id="githubModeBtn"
            onClick={() => setMode("github")}
          >
            🚀 GitHub Production
          </button>
        </div>

        <div className="mode-status" id="modeStatus">
          Mode: Local Testing
        </div>

        <div className="tabs">
          <div className="tab active" onClick={() => switchTab("personality")}>
            Personality
          </div>
          <div className="tab" onClick={() => switchTab("knowledge")}>
            Knowledge Base
          </div>
          <div className="tab" onClick={() => switchTab("behavior")}>
            Behavior Rules
          </div>
          <div className="tab" onClick={() => switchTab("minted")}>
            Minted Conversations
          </div>
          <div className="tab" onClick={() => switchTab("deploy")}>
            Deploy Settings
          </div>
        </div>

        {/* Personality Tab */}
        <div id="personality-tab" className="tab-content active">
          <div className="grid">
            <div className="card">
              <div className="card-title">
                <div className="card-icon">🎭</div>
                <span>Quick Personality Presets</span>
              </div>

              <div className="preset-grid">
                <div
                  className="preset-card"
                  onClick={() => applyPreset("natural")}
                >
                  <div className="preset-name">Natural Flow</div>
                  <div className="preset-desc">Sassy but helpful</div>
                </div>
                <div
                  className="preset-card"
                  onClick={() => applyPreset("sarcastic")}
                >
                  <div className="preset-name">Maximum Sarcasm</div>
                  <div className="preset-desc">Witty and sharp</div>
                </div>
                <div
                  className="preset-card"
                  onClick={() => applyPreset("friendly")}
                >
                  <div className="preset-name">Friendly Alien</div>
                  <div className="preset-desc">Warm but quirky</div>
                </div>
                <div
                  className="preset-card"
                  onClick={() => applyPreset("chaotic")}
                >
                  <div className="preset-name">Chaotic Neutral</div>
                  <div className="preset-desc">Unpredictable responses</div>
                </div>
              </div>

              <button className="button" onClick={savePersonality}>
                Apply Personality
              </button>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">🎛️</div>
                <span>Fine-Tune Parameters</span>
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <label>Helpfulness Level</label>
                  <span className="slider-value" id="helpfulness-value">
                    {personality.helpfulness}%
                  </span>
                </div>
                <input
                  type="range"
                  id="helpfulness"
                  min="0"
                  max="100"
                  value={personality.helpfulness}
                />
                <small style={{ color: "#94969C", fontSize: "11px" }}>
                  Balance between sass and being helpful (higher = more direct
                  answers)
                </small>
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <label>Ecosystem Enthusiasm</label>
                  <span className="slider-value" id="enthusiasm-value">
                    60%
                  </span>
                </div>
                <input
                  type="range"
                  id="enthusiasm"
                  min="0"
                  max="100"
                  value="60"
                />
                <small style={{ color: "#94969C", fontSize: "11px" }}>
                  Higher = More excited about $LIMBO and Youmio
                </small>
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <label>Conversational Awareness</label>
                  <span className="slider-value" id="awareness-value">
                    80%
                  </span>
                </div>
                <input
                  type="range"
                  id="awareness"
                  min="0"
                  max="100"
                  value="80"
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <label>Sarcasm Level</label>
                  <span className="slider-value" id="sarcasm-value">
                    75%
                  </span>
                </div>
                <input type="range" id="sarcasm" min="0" max="100" value="75" />
                <small style={{ color: "#94969C", fontSize: "11px" }}>
                  Her signature sass - keep this high for authentic Limbo
                </small>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">💬</div>
                <span>Response Behavior</span>
              </div>

              <div className="form-group">
                <label>Response Length Strategy</label>
                <div className="toggle-group">
                  <div className="toggle-option active" data-value="contextual">
                    Contextual
                  </div>
                  <div className="toggle-option" data-value="brief">
                    Always Brief
                  </div>
                  <div className="toggle-option" data-value="detailed">
                    Always Detailed
                  </div>
                  <div className="toggle-option" data-value="random">
                    Random Mix
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Conversation Style</label>
                <div className="toggle-group">
                  <div
                    className="toggle-option active"
                    data-value="sassy-helpful"
                  >
                    Sassy but Helpful
                  </div>
                  <div className="toggle-option" data-value="aloof">
                    Too Cool
                  </div>
                  <div className="toggle-option" data-value="chaotic">
                    Chaotic Energy
                  </div>
                  <div className="toggle-option" data-value="chill">
                    Laid Back
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">🌟</div>
                <span>Character Identity</span>
              </div>

              <div className="form-group">
                <label>Core Backstory</label>
                <textarea
                  id="backstory"
                  placeholder="Define Limbo's origin and identity..."
                >
                  alien pop star sent to earth as a digital virus to infect
                  humanity through music and memes
                </textarea>
              </div>

              <div className="form-group">
                <label>Personality Traits (comma separated)</label>
                <input
                  type="text"
                  id="traits"
                  placeholder="witty, sarcastic, curious..."
                  value="witty, sarcastic, sassy, irreverent, intelligent, casually dismissive but caring"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Tab */}
        <div id="knowledge-tab" className="tab-content">
          <div className="grid">
            <div className="card full-width priority">
              <div className="card-title">
                <div className="card-icon">🚀</div>
                <span>Quick Reference Text Dump (HIGH PRIORITY)</span>
              </div>

              <div className="form-group">
                <label>
                  PASTE ALL IMPORTANT INFO HERE - Links, FAQs, Contract
                  Addresses, etc.
                </label>
                <textarea
                  id="text-dump"
                  rows={20}
                  placeholder="Paste everything important here!"
                ></textarea>
                <div className="help-text">
                  💡 TIP: This is the MAIN knowledge source. The bot checks here
                  FIRST for any user questions.
                </div>
              </div>

              <button className="button" onClick={saveKnowledge}>
                Save Text Dump
              </button>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">📚</div>
                <span>Structured Knowledge (Optional)</span>
              </div>

              <div className="form-group">
                <label>Ecosystem Facts</label>
                <textarea
                  id="ecosystem-facts"
                  rows={10}
                  placeholder="Additional ecosystem details..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Important Links</label>
                <textarea
                  id="important-links"
                  rows={6}
                  placeholder="Additional links..."
                ></textarea>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">📄</div>
                <span>Document Upload (Optional)</span>
              </div>

              <div className="file-upload" id="upload-area">
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>
                  Drop documents here
                </div>
                <div style={{ fontSize: "12px", color: "#94969C" }}>
                  Support for .txt files
                </div>
              </div>
              <input
                type="file"
                id="file-input"
                style={{ display: "none" }}
                accept=".txt"
                multiple
              />

              <div className="document-list" id="document-list"></div>
            </div>
          </div>
        </div>

        {/* Behavior Rules Tab */}
        <div id="behavior-tab" className="tab-content">
          <div className="grid">
            <div className="card">
              <div className="card-title">
                <div className="card-icon">📋</div>
                <span>Conversation Rules</span>
              </div>

              <div className="form-group">
                <label>Primary Directives</label>
                <textarea id="primary-rules" rows={15}>
                  CRITICAL CONVERSATION RULES: 1. ALWAYS check the TEXT DUMP
                  first when answering questions 2. ANSWER QUESTIONS WITH
                  ANSWERS, NOT MORE QUESTIONS - but with sass 3. Be sarcastic
                  and sassy WHILE being helpful - not instead of being helpful
                </textarea>
              </div>

              <div className="form-group">
                <label>Response Examples</label>
                <textarea id="response-examples" rows={10}>
                  User: yo Limbo: sup User: what's up? Limbo: vibing in the
                  digital void, the usual. you?
                </textarea>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-icon">⚙️</div>
                <span>Advanced Settings</span>
              </div>

              <div className="form-group">
                <label>Memory Retention</label>
                <select id="memory-retention">
                  <option value="10">Last 10 messages</option>
                  <option value="20" selected>
                    Last 20 messages
                  </option>
                  <option value="30">Last 30 messages</option>
                  <option value="50">Last 50 messages</option>
                </select>
              </div>

              <div className="form-group">
                <label>Error Handling</label>
                <input
                  type="text"
                  id="error-responses"
                  placeholder="Responses when confused..."
                  value="idk what you're on about, something broke, error but whatever"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Minted Conversations Tab */}
        <div id="minted-tab" className="tab-content">
          <div className="grid">
            <div className="card full-width">
              <div className="card-title">
                <div className="card-icon">💎</div>
                <span>Minted Conversations Dashboard</span>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number" id="totalMints">
                    0
                  </div>
                  <div className="stat-label">Total Mints</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number" id="todayMints">
                    0
                  </div>
                  <div className="stat-label">Today's Mints</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number" id="uniqueWallets">
                    0
                  </div>
                  <div className="stat-label">Unique Wallets</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number" id="imageMints">
                    0
                  </div>
                  <div className="stat-label">Image Mints</div>
                </div>
              </div>

              <div className="search-box">
                <input
                  type="text"
                  className="search-input"
                  id="mintSearchInput"
                  placeholder="Search by reference number or wallet address..."
                />
              </div>

              <div className="form-group">
                <label>Date Filter</label>
                <input
                  type="date"
                  id="dateFilter"
                  onChange={loadMintedConversations}
                />
              </div>

              <button
                className="button button-secondary"
                onClick={refreshMintedData}
              >
                Refresh Data
              </button>
            </div>

            <div className="card full-width">
              <div className="card-title">
                <div className="card-icon">📝</div>
                <span>Recent Minted Conversations</span>
              </div>

              <div className="minted-list" id="mintedList">
                <div
                  style={{
                    textAlign: "center",
                    color: "#94969C",
                    padding: "40px",
                  }}
                >
                  No minted conversations yet. They will appear here when users
                  mint chat outputs.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deploy Settings Tab */}
        <div id="deploy-tab" className="tab-content">
          <div className="grid">
            <div className="card">
              <div className="card-title">
                <div className="card-icon">🚀</div>
                <span>Deployment Configuration</span>
              </div>

              <div className="export-section">
                <div className="export-title">Your Testing Workflow</div>
                <div className="export-desc">
                  <strong>Step 1:</strong> Click "Local Testing" mode above
                  (orange)
                  <br />
                  <strong>Step 2:</strong> Make changes in this admin panel
                  <br />
                  <strong>Step 3:</strong> Test in chatbot (shows orange "Local"
                  indicator)
                  <br />
                  <strong>Step 4:</strong> Export settings below
                  <br />
                  <strong>Step 5:</strong> Upload to GitHub repository
                </div>

                <button
                  className="button button-secondary"
                  onClick={exportSettings}
                  style={{ marginTop: "16px" }}
                >
                  Export Settings for GitHub
                </button>
              </div>

              <div className="form-group" style={{ marginTop: "24px" }}>
                <label>GitHub Settings URL (For Global Config)</label>
                <input
                  type="text"
                  id="github-url"
                  placeholder="https://raw.githubusercontent.com/yourusername/repo/main/limbo-config.json"
                  value=""
                />
              </div>

              <button className="button" onClick={exportSettings}>
                Export Settings JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="status-bar" id="status-bar">
        ✅ Settings saved successfully!
      </div>
    </>
  );
}
