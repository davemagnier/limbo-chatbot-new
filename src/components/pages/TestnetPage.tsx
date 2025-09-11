import { useEffect, useState,  } from "react";
import {
  authenticateWallet,
  claimTokens,
  closeExtensionModal,
  closeMyMints,
  completeOnboarding,
  connectSocial,
  copyToClipboard,
  disconnectWallet,
  downloadExtension,
  filterMints,
  getSession,
  getSIWEMessage,
  getTakeSignature,
  handleNetworkClick,
  onMount,
  openExtensionModal,
  openMyMints,
  skipOnboarding,
  startOnboarding,
  switchMobileTab,
  switchWallet,
} from "./testnet.ts";
import "./testnet.css";
import { injected, useAccount, useConnect, useSwitchChain, useChainId, useBalance, useSignMessage, useWriteContract, useReadContract } from 'wagmi'
import { config } from "../../wagmi/config.ts";
import { youtest } from "../../wagmi/chain.ts";
import { youmioSbtAbi } from "../../utils/contract/abis/youmioSbt.ts";

export default function TestnetPage() {
  const [termsAccepted, setAccepted] = useState(false);
  const [walletDropdown, toggleWalletDropdown] = useState(false);

  const [session, setSession] = useState("");
  const { signMessageAsync } = useSignMessage()
  const { writeContract } = useWriteContract()
  const { isConnected, address } = useAccount();
  const {data: balanceData} = useBalance({chainId: youtest.id, address})
  const chainId = useChainId();
  const { data: sbtBalance, error, isFetched } = useReadContract({
    chainId: youtest.id,
    address: "0x7A0A90E71834417ca3be405f1a81685368d516F6",
    abi: youmioSbtAbi,
    functionName: 'balanceOf',
    args: ["0x263bFD6CC2A50638532FAF8CDB20b131803496c1"],
    query: {
      enabled: !!address,
    },
  })

  console.log({error, sbtBalance, isFetched})
  
  const { switchChain } =
    useSwitchChain()

  const { connect } = useConnect({config})
  useEffect(() => {
    onMount();
  }, []);


  const handleSignIn = async () => {
    if (!isConnected || !address) {
      connect({connector: injected()})
    }

    // Assume you've obtained the SIWE message from your backend
    const message = await getSIWEMessage(address, window.location.origin)

    const signature = await signMessageAsync({
        message,
    })

    const sessionId = await getSession(address, signature, message)

    setSession(sessionId)
  };

  const handleMintSBT = async () => {
    const {signature, contract, from} = await getTakeSignature(session)

      writeContract({
      address: contract,
      abi: youmioSbtAbi,
      functionName: 'take',
      args: [from, signature],
    })
  }

  return (
    <>
      {/* Onboarding Flow */}
      <div className="onboarding-overlay" id="onboardingOverlay">
        <div className="onboarding-container" id="onboardingStep1">
          <div className="onboarding-header">
            <h1 className="onboarding-title">Youmio Testnet</h1>
            <p className="onboarding-subtitle">
              Experience the future of decentralized interactions. Test our
              chain, collect badges, and explore with Limbo.
            </p>
          </div>

          <div className="youmio-icon-preview">
            <img src="/assets/images/youmio-icon.png" alt="Youmio" id="youmioLogo" />
          </div>

          <div className="onboarding-actions">
            <button className="action-button primary" onClick={startOnboarding}>
              Enter Testnet
            </button>
            <button
              className="action-button secondary"
              onClick={skipOnboarding}
            >
              I'm already set up
            </button>
          </div>
        </div>

        <div
          className="onboarding-container compact"
          id="onboardingStep2"
          style={{ display: "none" }}
        >
          <div className="onboarding-header">
            <h1 className="onboarding-title">Connect & Get Started</h1>
            <p className="onboarding-subtitle">
              Set up your wallet and connect your accounts
            </p>
          </div>

          <div className="wallet-requirements">
            <div className="requirement-title">Wallet Requirements</div>
            <ul className="requirement-list">
              <li className="requirement-item">
                <span className="requirement-check">✔</span>
                <span>Minimum 0.03 ETH balance on mainnet</span>
              </li>
              <li className="requirement-item">
                <span className="requirement-check">✔</span>
                <span>At least 3 transactions on mainnet</span>
              </li>
              <li className="requirement-item">
                <span className="requirement-check">✔</span>
                <span>Maximum 1 request every 6 hours</span>
              </li>
            </ul>
          </div>

          <div className="social-connect-section">
            <div className="social-connect-title">Connect for bonus tokens</div>
            <div className="social-buttons">
              <button
                className="social-button"
                id="connectX"
                onClick={() => connectSocial("x")}
              >
                <span className="social-icon">𝕏</span>
                <span>Connect X</span>
              </button>
              <button
                className="social-button"
                id="connectDiscord"
                onClick={() => connectSocial("discord")}
              >
                <span className="social-icon">💬</span>
                <span>Discord</span>
              </button>
            </div>
          </div>

          <div className="onboarding-steps">
            <div className={"onboarding-step " + (isConnected ? "completed" : "active")} id="step1">
              <div className="step-number">1</div>
              <div className="step-title">Connect</div>
              <div className="step-desc">MetaMask</div>
            </div>
            <div className={"onboarding-step " + (isConnected ? chainId === youtest.id ? "completed" : "active" : "")} id="step2">
              <div className="step-number">2</div>
              <div className="step-title">Add Network</div>
              <div className="step-desc">Youmio</div>
            </div>
            <div className={"onboarding-step " + (isConnected && chainId === youtest.id && "active")} id="step3">
              <div className="step-number">3</div>
              <div className="step-title">Get Tokens</div>
              <div className="step-desc">Faucet</div>
            </div>
          </div>

          <div className="checkbox-container">
            <input
              type="checkbox"
              className="checkbox"
              id="termsCheckbox"
              checked={termsAccepted}
              onChange={(e) => setAccepted(e.target.checked)}
            ></input>
            <div className="checkbox-label">
              I acknowledge that I have read and agree to the{" "}
              <a href="#" target="_blank">
                Terms of Service
              </a>{" "}
              and understand that testnet tokens have no real value.
            </div>
          </div>

          <div className="onboarding-actions">
            <button
              className="action-button primary"
              id="addNetworkBtn"
              onClick={() => isConnected ? chainId === youtest.id ? completeOnboarding() : switchChain({chainId: youtest.id})  : connect({ connector: injected() })}
              disabled={!termsAccepted}
            >
              {isConnected ? chainId === youtest.id ? "Claim Tokens" :"Add Youmio Testnet": "Connect Wallet"}
            </button>
          </div>
              
        </div>
      </div>

      {/* Chrome Extension Modal */}
      <div
        className="extension-modal"
        id="extensionModal"
        onClick={closeExtensionModal}
      >
        <div className="extension-modal-content">
          <div className="extension-modal-header">
            <div className="extension-modal-icon">
              <img src="/assets/images/youmio-icon.png" alt="Youmio" />
            </div>
            <h2>Youmio Verify Extension</h2>
            <button className="modal-close" onClick={closeExtensionModal}>
              x
            </button>
          </div>

          <div className="extension-modal-body">
            <div className="extension-description">
              <p>
                Mint AI chat conversations directly to blockchain from any AI
                chat interface!
              </p>
              <p className="browser-note">
                Works with browser-based AI chats only (ChatGPT, Claude, etc.)
              </p>
              <div className="extension-features">
                <div className="feature-badge">
                  ✓ Works with Claude, ChatGPT & more
                </div>
                <div className="feature-badge">✓ One-click minting</div>
                <div className="feature-badge">✓ Testnet Demo</div>
              </div>
            </div>

            <div className="installation-steps">
              <h3>Quick Installation</h3>

              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Download Extension</h4>
                  <p>Click below to download the extension files</p>
                  <button className="download-btn" onClick={downloadExtension}>
                    <span>⬇</span> Download Extension.zip
                  </button>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Open Chrome Extensions</h4>
                  <p>Go to Chrome settings or type in address bar:</p>
                  <div className="url-copy-box">
                    <code>chrome://extensions/</code>
                    <button
                      onClick={() => copyToClipboard("chrome://extensions/")}
                      className="copy-btn"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Enable Developer Mode</h4>
                  <p>Toggle the "Developer mode" switch in the top right</p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>Load Extension</h4>
                  <p>Click "Load unpacked" and select the unzipped folder</p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">5</div>
                <div className="step-content">
                  <h4>Start Minting!</h4>
                  <p>
                    Visit any browser-based AI chat (ChatGPT, Claude, etc.) and
                    you'll see "Mint to Chain" buttons on AI responses
                  </p>
                </div>
              </div>
            </div>

            <div className="extension-footer">
              <p className="help-text">
                Need help? The extension adds "Mint to Chain" buttons to AI chat
                messages
              </p>
              <button
                className="action-button primary"
                onClick={downloadExtension}
              >
                Get Started - Download Extension
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mints Modal */}
      <div className="mints-modal" id="mintsModal">
        <div className="mints-modal-content">
          <div className="mints-modal-header">
            <h2>My Minted Conversations</h2>
            <button className="modal-close" onClick={closeMyMints}>
              x
            </button>
          </div>
          <div className="mints-modal-body" id="mintsModalBody">
            <div className="auth-container" id="authContainer">
              <div className="auth-icon">🔐</div>
              <h3>Authenticate to View Your Mints</h3>
              <p>
                Sign a message with your wallet to securely access your minted
                conversations.
              </p>
              <button className="auth-button" onClick={authenticateWallet}>
                Sign & Authenticate
              </button>
            </div>
            <div
              className="mints-list-container"
              id="mintsListContainer"
              style={{ display: "none" }}
            >
              <div className="mints-search">
                <input
                  type="text"
                  id="mintSearch"
                  placeholder="Search your mints..."
                  onKeyUp={filterMints}
                />
              </div>
              <div className="mints-list" id="mintsList">
                {/* Mints will be loaded here */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="background-gradient"></div>

      <div className="main-container" id="mainContainer">
        {/* Header */}
        <div className="header">
          <div className="logo-section">
            <img src="/assets/images/youmio-logo.png" alt="Youmio" className="youmio-logo" />
            <div className="testnet-badge">
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  background: "#4BBFEB",
                  borderRadius: "50%",
                }}
              ></span>
              YOUMIO TESTNET
            </div>
          </div>
          <div className="network-status">
            {/* Chrome Extension Button */}
            <button className="extension-button" onClick={openExtensionModal}>
              <div className="extension-button-content">
                <span className="extension-main-text">
                  <span>🔗</span> Try our Chrome Extension
                </span>
                <span className="extension-sub-text">Demo Only</span>
              </div>
            </button>

            <button
              className="network-button"
              id="networkButton"
              onClick={handleNetworkClick}
            >
              <span className="network-led" id="networkLed"></span>
              <span id="networkText">YOUMIO Testnet</span>
            </button>
            <div style={{ position: "relative" }}>
              <button
                className="wallet-button"
                id="walletButton"
                onClick={() =>toggleWalletDropdown(!walletDropdown)}
                disabled={isConnected}
              >
                {isConnected? address : "Connect Wallet"}
              </button>
              <div className={"wallet-dropdown " + (walletDropdown ? "show" : "")} id="walletDropdown">
                <div className="wallet-info">
                  <div
                    className="wallet-address-full"
                    id="walletAddressFull"
                  ></div>
                  <div className="wallet-balance">
                    Balance: <span id="dropdownBalance">{balanceData?.value}</span> YTEST
                  </div>
                </div>
                <button className="dropdown-button" onClick={switchWallet}>
                  <span>🔄</span> Switch Wallet
                </button>
                <button
                  className="dropdown-button danger"
                  onClick={disconnectWallet}
                >
                  <span>🔌</span> Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content-wrapper">
          {/* Desktop: Sidebar Modules */}
          <div className="sidebar-modules" id="desktopModules">
            {/* Faucet Module */}
            <div className="module-card compact">
              <div className="module-header">
                <div className="module-title">
                  <div className="module-icon">💧</div>
                  <span>Test Faucet</span>
                </div>
              </div>
              <div className="module-content">
                <div className="token-display">
                  <div>
                    <div className="token-amount" id="tokenBalance">
                      {balanceData?.value || 0}
                    </div>
                    <div className="token-label">$YTEST</div>
                  </div>
                  <div className="module-icon">🪙</div>
                </div>
                <button
                  className="faucet-button"
                  id="faucetButton"
                  onClick={() => session ? claimTokens(session): handleSignIn()}
                >
                  <span>{session ? "Claim YTEST Tokens" : "Sign In"}</span>
                </button>
                <div className="limit-text">
                  Daily limit: <span id="claimsLeft">100</span>/100
                </div>
              </div>
            </div>

            {/* Badge Module */}
            <div className="module-card">
              <div className="module-header">
                <div className="module-title">
                  <div className="module-icon">🏆</div>
                  <span>Soulbound Badge</span>
                </div>
              </div>
              <div className="module-content">
                <div className="badge-display-container">
                  <div
                    className="badge-display not-minted"
                    id="badgeDisplayContainer"
                  >
                    <img
                      src={sbtBalance > 0 ? "https://testnet-main.netlify.app/youmio-sbt.jpg" : "badge-not-minted.png"}
                      alt="Badge"
                      id="badgeImage"
                    />
                  </div>
                </div>
                <button
                  className="mint-badge-button"
                  id="badgeButton"
                  onClick={handleMintSBT}
                  disabled={sbtBalance > 0}
                >
                  <span>Mint Soulbound Badge</span>
                </button>
                <div className="limit-text">
                  Prove your testnet participation
                </div>
              </div>
            </div>

            {/* Stats Module */}
            <div className="module-card compact">
              <div className="module-header">
                <div className="module-title">
                  <div className="module-icon">📊</div>
                  <span>Your Stats</span>
                </div>
              </div>
              <div className="module-content">
                <div className="stats-list">
                  <div className="stat-item">
                    <span className="stat-label">Testnet Tokens</span>
                    <span className="stat-value" id="statTokens">
                      {balanceData?.value} $YTEST
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Badge Status</span>
                    <span className="stat-value" id="statBadge">
                      {sbtBalance > 0 ? "Minted" : "Not Minted"}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Chats Minted</span>
                    <span className="stat-value" id="statChats">
                      0
                    </span>
                  </div>
                </div>
                {/* NEW: My Mints Button */}
                <button
                  className="view-mints-button"
                  id="viewMintsButton"
                  onClick={openMyMints}
                >
                  <span>📜</span> View My Minted Chats
                </button>
              </div>
            </div>
          </div>

          {/* Mobile: Tab Content for Modules */}
          <div className="mobile-content" id="mobileModules">
            {/* Same modules will be cloned here for mobile */}
          </div>

          {/* Desktop & Mobile: Chat Area */}
          <div className="chatbot-wrapper" id="chatbotWrapper">
            <div className="chat-header">
              <div className="limbo-avatar">
                <img src="/assets/images/limbo-selfie.jpg" alt="Limbo" />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-title">Chat with Limbo</div>
                <div className="chat-header-subtitle">
                  Test the chain by minting conversations
                </div>
              </div>
              <div className="api-indicator">
                <span className="api-led" id="apiLed"></span>
                <span id="apiText">API</span>
              </div>
            </div>

            <div className="chat-messages" id="chatMessages">
              <div className="message assistant">
                <div className="message-label">Limbo</div>
                <div className="message-content">
                  yo, welcome to the testnet. mint some tokens and let's test
                  this chain
                </div>
              </div>
            </div>

            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  className="chat-input"
                  id="chatInput"
                  placeholder="type something..."
                  autoComplete="off"
                />
                <button className="send-button" id="sendButton" type="button">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="mobile-tabs" id="mobileTabs">
          <button
            className="mobile-tab-button active"
            onClick={() => switchMobileTab("modules")}
          >
            <span className="mobile-tab-icon">💎</span>
            <span>Modules</span>
          </button>
          <button
            className="mobile-tab-button"
            onClick={() => switchMobileTab("chat")}
          >
            <span className="mobile-tab-icon">💬</span>
            <span>Chat</span>
          </button>
        </div>
      </div>
    </>
  );
}