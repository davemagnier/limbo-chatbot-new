import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { watchAccount } from "@wagmi/core";
import { useState } from "react";
import { formatEther } from "viem";
import {
	useAccount,
	useBalance,
	useChainId,
	useDisconnect,
	useReadContract,
	useSignMessage,
	useSwitchChain,
	useWriteContract,
} from "wagmi";
import { useSession } from "../../hooks/use-session.ts";
import { getChatReply } from "../../utils/chat-api.ts";
import { youmioSbtAbi } from "../../utils/contract/abis/youmioSbt.ts";
import { youtest } from "../../wagmi/chain.ts";
import { config } from "../../wagmi/config.ts";
import ChatWidget from "../ChatWidget.tsx";
import { FaucetCooldown, fetchCooldown } from "../faucet-cooldown.tsx";
import WalletConnectModal from "../WalletConnectModal.tsx";
import "./testnet.css";
import {
	authenticateWallet,
	claimTokens,
	closeExtensionModal,
	closeMyMints,
	completeOnboarding,
	copyToClipboard,
	downloadExtension,
	filterMints,
	getMintedMessages,
	getMintMessageSignature,
	getSession,
	getSIWEMessage,
	getTakeSignature,
	openExtensionModal,
	openMyMints,
} from "./testnet.ts";

export default function TestnetPage() {
	const [termsAccepted, setAccepted] = useState(false);
	const [walletDropdown, toggleWalletDropdown] = useState(false);
	const { session, saveSession } = useSession();
	const [tab, setTab] = useState<"modules" | "chat">("modules");
	const [onboardingStep, setOnboardingStep] = useState<
		"init" | "in_progress" | "complete"
	>(session ? "complete" : "init");
	const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
	const { disconnect } = useDisconnect();
	const { isConnected, address } = useAccount();
	const queryClient = useQueryClient();

	const {
		data: cooldownInSeconds,
		isPending: isCooldownPending,
		error: cooldownError,
	} = useQuery({
		queryFn: async () => {
			const { nextClaimIn, error, response } = await fetchCooldown(session);
			if (response && response.status === 403) {
				saveSession(null);
			}
			if (error === "NOT_ALLOWLISTED") {
				setIsAllowlisted(false);
			} else {
				setIsAllowlisted(true);
			}
			return nextClaimIn;
		},
		queryKey: [session, "cooldown"],
	});

	const { signMessageAsync } = useSignMessage();
	const { writeContractAsync } = useWriteContract();

	watchAccount(config, {
		onChange(account, prevAccount) {
			if (account.address !== prevAccount.address) saveSession(null);
		},
	});

	const {
		data: sbtBalance,
		refetch: refetchSBTBalance,
		isLoading: isSbtBalanceLoading,
	} = useReadContract({
		chainId: youtest.id,
		address: import.meta.env.VITE_SBT_CONTRACT_ADDRESS,
		abi: youmioSbtAbi,
		functionName: "balanceOf",
		args: [address!],
	});

	const hasSbt = (sbtBalance ?? 0n) > 0n;

	const { data: tokenId } = useReadContract({
		chainId: youtest.id,
		address: import.meta.env.VITE_SBT_CONTRACT_ADDRESS,
		abi: youmioSbtAbi,
		functionName: "walletStore",
		args: [address!],
	});

	const { data: tokenBalanceData } = useBalance({
		chainId: youtest.id,
		address,
	});
	const [isWalletConnectModalOpen, setIsWalletConnectModalOpen] =
		useState(false);
	const chainId = useChainId();

	const tokenBalance = formatEther(tokenBalanceData?.value ?? 0n);
	const hasTokenBalance = Number(tokenBalance) > 0;

	const [chatMessages, setChatMessages] = useState([
		{
			content:
				"Yo, welcome to the testnet. Mint some tokens and let's test this chain.",
			isUser: false,
		},
	]);

	const { switchChain } = useSwitchChain();

	const { mutate: mintSBT, isPending: isTakePending } = useMutation({
		mutationFn: async () => {
			if (!session) return;
			const { signature, contract, from, response } =
				await getTakeSignature(session);

			await writeContractAsync({
				address: contract,
				abi: youmioSbtAbi,
				functionName: "take",
				args: [from, signature],
			});

			return response;
		},
		async onSettled(response) {
			await refetchSBTBalance();
			if (response && response.status === 403) {
				saveSession(null);
			}
		},
	});

	const { mutateAsync: mintMessage } = useMutation({
		mutationFn: async (message: string) => {
			console.log("Minting message");
			console.log({ session, tokenId });
			if (!session || !tokenId) return;
			const { signature, contract, messageHash, response } =
				await getMintMessageSignature(session, message, tokenId?.toString());

			await writeContractAsync({
				address: contract,
				abi: youmioSbtAbi,
				functionName: "mintMessage",
				args: [tokenId, messageHash, signature],
			});

			return response;
		},
		async onSettled(response) {
			await refetchMessages();
			if (response && response.status === 403) {
				saveSession(null);
			}
		},
	});

	const handleMintSBT = () => {
		if (!session) {
			console.error("Missing Session");
			return;
		}

		mintSBT();
	};

	const { mutate: faucetClaim, isPending: isFaucetClaimPending } = useMutation({
		mutationFn: async () => {
			if (!session) return;
			const response = await claimTokens(session);

			return response;
		},
		onSettled(response) {
			queryClient.invalidateQueries({
				queryKey: [session, "cooldown"],
			});

			if (response && response.status === 403) {
				saveSession(null);
			}
		},
	});

	const handleFaucetClaim = async () => {
		if (!session) {
			console.error("Session missing");

			return;
		}

		faucetClaim();
	};

	const { data: messages, refetch: refetchMessages } = useQuery({
		queryFn: async () => {
			const { messages, response } = await getMintedMessages(
				session!,
				tokenId!.toString(),
			);
			if (response && response.status === 403) {
				saveSession(null);
			}

			return messages;
		},
		queryKey: [session, "messages"],
		enabled: Boolean(session) && Boolean(tokenId),
		initialData: [],
	});

	const { mutate: generateSession, isPending: isAuthPending } = useMutation({
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

	const canMint =
		session && !hasSbt && hasTokenBalance && isAllowlisted === true;

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

			<div id="contentContainer">
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
					<div
						className={`modules-header${tab === "modules" ? " active" : ""}`}
					>
						{/* Header */}
						<div className="header">
							<div className="logo-section">
								<img
									src="/assets/images/youmio-logo.png"
									alt="Youmio"
									className="youmio-logo"
								/>
							</div>
							<div className="network-status">
								<button
									className="extension-button"
									onClick={openExtensionModal}
								>
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
									onClick={() => switchChain({ chainId: youtest.id })}
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
										className={
											"wallet-dropdown " + (walletDropdown ? "show" : "")
										}
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
													{Number(tokenBalance).toFixed(4).toString()}
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
					</div>

					{/* Main Content */}
					<div className="content-wrapper">
						{/* Desktop: Sidebar Modules */}
						<div
							className={`modules-container${
								tab === "modules" ? " active" : ""
							}`}
						>
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
												{Number(tokenBalance).toFixed(4).toString()}
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
											isCooldownPending ||
											(cooldownInSeconds ?? 0) > 0 ||
											isAllowlisted === false
										}
										onClick={() =>
											session ? handleFaucetClaim() : handleSignIn()
										}
									>
										<span
											className={
												isFaucetClaimPending ||
												isAuthPending ||
												isCooldownPending
													? "loading-spinner"
													: ""
											}
										>
											{isFaucetClaimPending ||
											isAuthPending ||
											isCooldownPending
												? ""
												: session
													? isAllowlisted === true
														? "Claim YTEST"
														: "Not On Allowlist"
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
										disabled={!canMint}
									>
										<span
											className={
												isSbtBalanceLoading || isTakePending
													? "loading-spinner"
													: ""
											}
										>
											{isSbtBalanceLoading || isTakePending
												? ""
												: (sbtBalance ?? 0n) > 0n
													? `Owner of token ${tokenId}`
													: "Mint Badge"}
										</span>
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
												{Number(tokenBalance).toFixed(4).toString()} $YTEST
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

						{/* Desktop & Mobile: Chat Area */}
						<div className={`chat-container${tab === "chat" ? " active" : ""}`}>
							<ChatWidget
								disabled={!Boolean(session)}
								messages={chatMessages}
								onMint={async (message) => {
									await mintMessage(message);
								}}
								onSend={async (message) => {
									setChatMessages((cm) => [
										...cm,
										{ content: message, isUser: true },
										{ content: "...", isUser: false },
									]);
									const reply = await getChatReply(
										{
											prompt: message,
											conversationHistory: chatMessages.map(
												({ content, isUser }) => ({
													content,
													role: isUser ? "user" : "assistant",
												}),
											),
										},
										session!,
									);
									if (reply)
										setChatMessages((cm) => [
											...cm.filter(
												(m) => !(m.content === "..." && m.isUser === false),
											),
											{ content: reply, isUser: false },
										]);
								}}
							/>
						</div>
					</div>
				</div>

				{/* Mobile Tab Navigation */}
				<div className="mobile-tabs" id="mobileTabs">
					<button
						className="mobile-tab-button active"
						onClick={() => setTab("modules")}
					>
						<span className="mobile-tab-icon">💎</span>
						<span>Modules</span>
					</button>
					<button className="mobile-tab-button" onClick={() => setTab("chat")}>
						<span className="mobile-tab-icon">💬</span>
						<span>Chat</span>
					</button>
				</div>
			</div>
		</>
	);
}
