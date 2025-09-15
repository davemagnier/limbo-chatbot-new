import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { youmioSbtAbi } from "../utils/contract/abis/youmioSbt";
import { youtest } from "../wagmi/chain";
import "./pages/limbo-chatbot.css";
import "./pages/testnet.css";

// Define TypeScript interfaces
interface Message {
	id?: string;
	content: string;
	isUser: boolean;
	timestamp?: Date;
}

interface ChatWidgetProps {
	disabled?: "limit-reached" | "not-minted" | "other";
	messages: Message[];
	onSend: (message: string) => void;
	onMint: (message: string) => Promise<void>;
}

function ChatMessage({
	message,
	onMint,
}: {
	message: Message;
	onMint?: (message: string) => Promise<void>;
}) {
	const [isLoading, setIsLoading] = useState(false);
	return (
		<div className={`message ${message.isUser ? "user" : "assistant"}`}>
			<div className="message-label">{message.isUser ? "You" : "Limbo"}</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
					alignItems: "start",
				}}
			>
				<div className="message-content">{message.content}</div>
				{!message.isUser && onMint && message.content !== "..." && (
					<button
						type="button"
						className={`mint-message-button`}
						onClick={async () => {
							setIsLoading(true);
							await onMint(message.content).catch((e) => {
								console.log(e);
								setIsLoading(false);
							});
							setIsLoading(false);
						}}
					>
						{!isLoading ? (
							"Mint to chain"
						) : (
							<span className="loading-spinner" />
						)}
					</button>
				)}
			</div>
		</div>
	);
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
	messages,
	onSend,
	onMint,
	disabled,
}) => {
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { address } = useAccount();

	const { data: sbtBalance } = useReadContract({
		chainId: youtest.id,
		address: import.meta.env.VITE_SBT_CONTRACT_ADDRESS,
		abi: youmioSbtAbi,
		functionName: "balanceOf",
		args: [address!],
	});

	const handleSend = () => {
		if (inputValue.trim()) {
			onSend(inputValue.trim());
			setInputValue("");
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	useEffect(() => {
		if (messagesEndRef.current != null) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	return (
		<div className="chatbot-wrapper">
			<div className="chat-header">
				<div className="limbo-avatar">
					<img src="/assets/images/limbo-selfie.jpg" alt="Limbo" />
				</div>
				<div className="chat-header-info">
					<div className="chat-header-title">Limbo</div>
					<div className="chat-header-subtitle">
						Test the chain by minting conversations
					</div>
				</div>
				<div className="api-indicator">
					<span className="api-led" id="apiLed"></span>
					<span id="apiText">API</span>
				</div>
			</div>

			{disabled === "limit-reached" && (
				<span
					style={{
						width: "100%",
						display: "block",
						padding: "0.5rem",
						background: "salmon",
						textAlign: "center",
					}}
				>
					DAILY LIMIT REACHED, CHECK BACK TOMORROW
				</span>
			)}

			<div className="chat-messages">
				{messages.map((message, index) => (
					<ChatMessage
						key={message.id || index}
						message={message}
						onMint={index !== 0 ? onMint : undefined}
					/>
				))}
				<div ref={messagesEndRef} />
			</div>

			<div className="chat-input-container">
				<div className="chat-input-wrapper">
					<input
						type="text"
						disabled={Boolean(disabled) || sbtBalance === 0n}
						className="chat-input"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyUp={handleKeyPress}
						placeholder={
							disabled === "limit-reached"
								? "Limit reached, check back later"
								: disabled === "other"
									? "Sign in to chat"
									: disabled === "not-minted"
										? "Mint your SBT to chat with Limbo"
										: "Type something..."
						}
						autoComplete="off"
					/>
					<button
						className="send-button"
						onClick={handleSend}
						disabled={
							Boolean(disabled) || !inputValue.trim() || sbtBalance === 0n
						}
						type="button"
					>
						→
					</button>
				</div>
			</div>
		</div>
	);
};

export default ChatWidget;
