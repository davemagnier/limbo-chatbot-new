import { useState, useRef, useEffect } from "react";

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
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
	messages,
	onSend,
	disabled = false,
}) => {
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

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
					<div
						key={message.id || index}
						className={`message ${message.isUser ? "user" : "assistant"}`}
					>
						<div className="message-label">
							{message.isUser ? "You" : "Limbo"}
						</div>
						<div className="message-content">{message.content}</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<div className="chat-input-container">
				<div className="chat-input-wrapper">
					<input
						type="text"
						disabled={disabled}
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
						disabled={disabled || !inputValue.trim()}
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
