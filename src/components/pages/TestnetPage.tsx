import { useEffect, useState } from "react";
import {
  authenticateWallet,
  claimTokens,
  closeMyMints,
  completeOnboarding,
  filterMints,
  getMintedMessages,
  getSession,
  getSIWEMessage,
  getTakeSignature,
  handleNetworkClick,
  openMyMints,
  switchMobileTab,
} from "./testnet.ts";
import ChatWidget from "../ChatWidget.tsx";
import "./testnet.css";
import {
  useAccount,
  useSwitchChain,
  useChainId,
  useBalance,
  useDisconnect,
  useSignMessage,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { youtest } from "../../wagmi/chain.ts";
import WalletConnectModal from "../WalletConnectModal.tsx";
import { youmioSbtAbi } from "../../utils/contract/abis/youmioSbt.ts";
import { formatEther } from "viem";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../hooks/use-session.ts";
import { FaucetCooldown, fetchCooldown } from "../faucet-cooldown.tsx";
import { getChatReply } from "../../utils/chat-api.ts";

export default function TestnetPage() {
  const [termsAccepted, setAccepted] = useState(false);
  const [walletDropdown, toggleWalletDropdown] = useState(false);
  const { session, saveSession } = useSession();
  const [onboardingStep, setOnboardingStep] = useState<
    "init" | "in_progress" | "complete"
  >(session ? "complete" : "init");
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();
  const queryClient = useQueryClient();
  const { data: cooldownInSeconds } = useQuery({
    queryFn: () => fetchCooldown(session),
    queryKey: [session, "cooldown"],
  });

  const { signMessageAsync } = useSignMessage();
  const { writeContract } = useWriteContract();
  const { data: sbtBalance } = useReadContract({
    chainId: youtest.id,
    address: import.meta.env.VITE_SBT_CONTRACT_ADDRESS,
    abi: youmioSbtAbi,
    functionName: "balanceOf",
    args: [address!],
  });
  const { data: balanceData } = useBalance({ chainId: youtest.id, address });
  const [isWalletConnectModalOpen, setIsWalletConnectModalOpen] =
    useState(false);
  const chainId = useChainId();

  const balance = formatEther(balanceData?.value ?? 0n);

  const [chatMessages, setChatMessages] = useState([
    {
      content:
        "Yo, welcome to the testnet. Mint some tokens and let's test this chain.",
      isUser: false,
    },
  ]);

  const { switchChain } = useSwitchChain();

  const handleMintSBT = async () => {
    if (!session) return;
    const { signature, contract, from } = await getTakeSignature(session);

    writeContract({
      address: contract,
      abi: youmioSbtAbi,
      functionName: "take",
      args: [from, signature],
    });
  };

  const { mutate: faucetClaim, isPending: isFaucetClaimPending } = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await claimTokens(session);
      queryClient.invalidateQueries({ queryKey: [session, "cooldown"] });
    },
  });

  const handleFaucetClaim = async () => {
    if (!session) {
      console.error("Session missing");

      return;
    }

    faucetClaim();
  };

  const { data: messages, isLoading } = useQuery({
    queryFn: async () => getMintedMessages(session!),
    queryKey: [session, "messages"],
    enabled: Boolean(session),
    initialData: [],
  });

  const {
    data: sessiion,
    mutate: generateSession,
    isPending: isAuthPending,
  } = useMutation({
    mutationFn: async () => {
      if (!address) return;
      const message = await getSIWEMessage(address, window.location.origin);

      const signature = await signMessageAsync({
        message,
      });

      const sessionId = await getSession(address, signature, message);
      return sessionId;
    },
    onSuccess(session) {
      if (session) saveSession(session);
      else saveSession(null);
    },
  });

  const handleSignIn = async () => {
    if (!isConnected) {
      setIsWalletConnectModalOpen(true);
      console.log("Opening modal");
      return;
    }

    if (!address) {
      console.error("Address missing");
      return;
    }

    if (chainId !== youtest.id) {
      switchChain({ chainId: youtest.id });
      return;
    }

    if (onboardingStep !== "complete") {
      completeOnboarding();
      setOnboardingStep("complete");
      return;
    }

    if (onboardingStep === "complete") {
      generateSession();
    }
  };

  return (
    <>
      <WalletConnectModal
        isOpen={isWalletConnectModalOpen}
        onClose={() => setIsWalletConnectModalOpen(false)}
      />
      {/* Onboarding Flow */}
      {onboardingStep !== "complete" && (
        <div className="onboarding-overlay" id="onboardingOverlay">
          {onboardingStep === "init" && (
            <div className="onboarding-container" id="onboardingStep1">
              <div className="onboarding-header">
                <h1 className="onboarding-title">Youmio Testnet</h1>
                <p className="onboarding-subtitle">
                  Experience the future of decentralized interactions. Test our
                  chain, collect badges, and explore with Limbo.
                </p>
              </div>

              <div className="youmio-icon-preview">
                <img
                  src="/assets/images/youmio-icon.png"
                  alt="Youmio"
                  id="youmioLogo"
                />
              </div>
              <div className="onboarding-actions">
                <button
                  className="action-button primary"
                  onClick={() => setOnboardingStep("in_progress")}
                >
                  Enter Testnet
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => {
                    setOnboardingStep("complete");
                    completeOnboarding();
                  }}
                >
                  I'm already set up
                </button>
              </div>
            </div>
          )}

          {onboardingStep === "in_progress" && (
            <div className="onboarding-container compact" id="onboardingStep2">
              <div className="onboarding-header">
                <h1 className="onboarding-title">Connect & Get Started</h1>
                <p className="onboarding-subtitle">
                  Set up your wallet and connect your accounts
                </p>
              </div>

              <div className="onboarding-steps">
                <button
                  className={
                    "onboarding-step " + (isConnected ? "completed" : "active")
                  }
                  id="step1"
                >
                  <div className="step-number">1</div>
                  <div className="step-title">Connect</div>
                  <div className="step-desc">Wallet</div>
                </button>
                <div
                  className={
                    "onboarding-step " +
                    (isConnected
                      ? chainId === youtest.id
                        ? "completed"
                        : "active"
                      : "")
                  }
                  id="step2"
                >
                  <div className="step-number">2</div>
                  <div className="step-title">Add Network</div>
                  <div className="step-desc">Youmio</div>
                </div>
                <div
                  className={
                    "onboarding-step " +
                    (isConnected && chainId === youtest.id && "active")
                  }
                  id="step3"
                >
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
                  id="connect-wallet"
                  onClick={handleSignIn}
                  disabled={!termsAccepted}
                >
                  {isConnected
                    ? chainId === youtest.id
                      ? "Claim Tokens"
                      : "Add Youmio Testnet"
                    : "Connect Wallet"}
                </button>
                {isConnected && (
                  <button
                    className="action-button secondary"
                    id="connect-wallet"
                    onClick={() => disconnect()}
                  >
                    {"Disconnect"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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

      <div
        className={`main-container ${
          onboardingStep === "complete" ? "visible" : ""
        }`}
        id="mainContainer"
      >
        {/* Header */}
        <div className="header">
          <div className="logo-section">
            <img
              src="/assets/images/youmio-logo.png"
              alt="Youmio"
              className="youmio-logo"
            />
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
                onClick={() => {
                  if (isConnected) toggleWalletDropdown(!walletDropdown);
                  else {
                    setIsWalletConnectModalOpen(true);
                    toggleWalletDropdown(false);
                  }
                }}
              >
                {isConnected ? address : "Connect Wallet"}
              </button>
              <div
                className={"wallet-dropdown " + (walletDropdown ? "show" : "")}
                id="walletDropdown"
              >
                <div className="wallet-info">
                  <div
                    className="wallet-address-full"
                    id="walletAddressFull"
                  ></div>
                  <div className="wallet-balance">
                    Balance:{" "}
                    <span id="dropdownBalance">
                      {Number(balance).toFixed(2).toString()}
                    </span>{" "}
                    YTEST
                  </div>
                </div>
                <button
                  className="dropdown-button"
                  onClick={() => {
                    setIsWalletConnectModalOpen(true);
                    toggleWalletDropdown(false);
                  }}
                >
                  <span>🔄</span> Switch Wallet
                </button>
                <button
                  className="dropdown-button danger"
                  onClick={() => disconnect()}
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
                      {Number(balance).toFixed(2).toString()}
                    </div>
                    <div className="token-label">$YTEST</div>
                  </div>
                  <div className="module-icon">🪙</div>
                </div>
                <button
                  className="faucet-button"
                  id="faucetButton"
                  disabled={
                    isFaucetClaimPending ||
                    isAuthPending ||
                    (cooldownInSeconds ?? 0) > 0
                  }
                  onClick={() =>
                    session ? handleFaucetClaim() : handleSignIn()
                  }
                >
                  <span
                    className={
                      isFaucetClaimPending || isAuthPending
                        ? "loading-spinner"
                        : ""
                    }
                  >
                    {isFaucetClaimPending || isAuthPending
                      ? ""
                      : session
                      ? "Claim YTEST"
                      : "Sign In"}
                  </span>
                </button>
                <div className="limit-text">
                  <FaucetCooldown>
                    <>
                      Daily limit:{" "}
                      <span id="claimsLeft">
                        {(cooldownInSeconds ?? 0) > 0 ? 1 : 0}
                      </span>
                      /1
                    </>
                  </FaucetCooldown>
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
                      src={
                        (sbtBalance ?? 0n) > 0n
                          ? "/assets/images/youmio-sbt.jpg"
                          : "/assets/images/youmio-sbt-unminted.jpg"
                      }
                      alt="Badge"
                      id="badgeImage"
                    />
                  </div>
                </div>
                <button
                  className="mint-badge-button"
                  id="badgeButton"
                  onClick={handleMintSBT}
                  disabled={!session || (sbtBalance ?? 0n) > 0n}
                >
                  <span>Mint Badge</span>
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
                      {Number(balance).toFixed(2).toString()} $YTEST
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Badge Status</span>
                    <span className="stat-value" id="statBadge">
                      {(sbtBalance ?? 0n) > 0n ? "Minted" : "Not Minted"}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Chats Minted</span>
                    <span className="stat-value" id="statChats">
                      {messages.length}
                    </span>
                  </div>
                </div>
                {/* NEW: My Mints Button */}
                <button
                  className="view-mints-button"
                  id="viewMintsButton"
                  onClick={() => openMyMints(messages)}
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
          <ChatWidget
            disabled={!Boolean(session)}
            messages={chatMessages}
            onSend={async (message) => {
              setChatMessages((cm) => [
                ...cm,
                { content: message, isUser: true },
              ]);
              const reply = await getChatReply(
                {
                  prompt: message,
                  conversationHistory: chatMessages.map(
                    ({ content, isUser }) => ({
                      content,
                      role: isUser ? "user" : "assistant",
                    })
                  ),
                },
                session!
              );
              if (reply)
                setChatMessages((cm) => [
                  ...cm,
                  { content: reply, isUser: false },
                ]);
            }}
          />
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
