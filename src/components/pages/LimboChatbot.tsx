import { useEffect, useState } from "react";
import "./limbo-chatbot.css";
import { onMount } from "./limbo-chatbox";
import WalletConnectModal from "../WalletConnectModal.tsx";

export default function LimboChatbot() {
	const [isWalletConnectModalOpen, setIsWalletConnectModalOpen] = useState(false);

	useEffect(() => {
		console.log("In chatbot");
		onMount();
	}, []);

	return (
		<>
			<WalletConnectModal 
				isOpen={isWalletConnectModalOpen}
				onClose={() => setIsWalletConnectModalOpen(false)}
			/>
			<a href="limbo-admin.html" target="_blank" className="admin-link">
				Admin Panel
			</a>

			<div className="chat-container">
				<div className="chat-header">
					<div className="limbo-avatar">
						<img src="limbo-selfie.jpg" alt="Limbo" />
					</div>
					<div className="header-info">
						<div className="header-title">Chat with Limbo</div>
						<div className="header-subtitle">
							Shoot the breeze with Limbo and mint any of her outputs to chain
							with a click
						</div>
					</div>
					<div className="header-actions">
						<div className="mode-indicator" id="modeIndicator">
							<span>🧪 Local</span>
						</div>
						<div className="api-indicator">
							<span className="api-led" id="apiLed"></span>
							<span id="apiText">API</span>
						</div>
						<button 
						className="wallet-button" 
						id="walletButton"
						onClick={() => setIsWalletConnectModalOpen(true)}
					>
						Connect Wallet
					</button>
					</div>
				</div>

				<div className="chat-messages" id="chatMessages">
					<div className="message assistant">
						<div className="message-label">Limbo</div>
						<div className="message-content">yo</div>
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
		</>
	);
}
