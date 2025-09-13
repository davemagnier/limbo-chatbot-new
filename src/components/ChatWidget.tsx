import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { youmioSbtAbi } from "../utils/contract/abis/youmioSbt";
import { youtest } from "../wagmi/chain";

// Define TypeScript interfaces
interface Message {
	id?: string;
	content: string;
	isUser: boolean;
	timestamp?: Date;
}

interface ChatWidgetProps {
	disabled: boolean;
	messages: Message[];
	onSend: (message: string) => void;
	onMint: (message: string) => void | Promise<void>;
}

function ChatMessage({
	message,
	onMint,
}: {
	message: Message;
	onMint?: (message: string) => void | Promise<void>;
}) {
	return (
		<div className={`message ${message.isUser ? "user" : "assistant"}`}>
			<div className="message-label">{message.isUser ? "You" : "Limbo"}</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					gap: "0.5rem",
					alignItems: "center",
				}}
			>
				<div className="message-content">{message.content}</div>
				{!message.isUser && onMint && (
					<button
						style={{
							fontSize: "12px",
							borderRadius: "24px",
							padding: "0.5rem 0.75rem",
							background: "transparent",
							color: "white",
							border: "1px solid",
							borderColor: "white",
						}}
						onClick={async () => {
							console.log({ message });
							await onMint(message.content);
						}}
					>
						Mint
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
	disabled = false,
}) => {
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { address } = useAccount();

	const { data: sbtBalance, refetch: refetchSBTBalance } = useReadContract({
		chainId: youtest.id,
		address: import.meta.env.VITE_SBT_CONTRACT_ADDRESS,
		abi: youmioSbtAbi,
		functionName: "balanceOf",
		args: [address!],
	});

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

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

			<div className="chat-messages" id="chatMessages">
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
						disabled={disabled || sbtBalance === 0n}
						className="chat-input"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyUp={handleKeyPress}
						placeholder="Type something..."
						autoComplete="off"
					/>
					<button
						className="send-button"
						onClick={handleSend}
						disabled={disabled || !inputValue.trim() || sbtBalance === 0n}
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
