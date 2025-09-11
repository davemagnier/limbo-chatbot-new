import React, { useEffect } from "react";
import { useConnect, useAccount, type Connector } from "wagmi";
import "./pages/testnet.css";

interface WalletConnectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { connectors, connect, isPending, error } = useConnect();
	const { isConnected } = useAccount();

	// Handle connection
	const handleConnect = async (connector: Connector) => {
		connect({ connector }, { onSuccess: () => onClose() });
	};

	// Close modal when clicking outside
	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="extension-modal show" onClick={handleBackdropClick}>
			<div className="extension-modal-content">
				<div className="extension-modal-header">
					<h2>Connect Wallet</h2>
					<button className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="extension-modal-body">
					<div className="extension-description">
						<p>Choose your preferred wallet to connect to the Youmio Testnet</p>
					</div>

					<div className="installation-steps">
						{connectors.length === 0 ? (
							<div className="step-card">
								<p>No wallets found. Please install a compatible wallet.</p>
							</div>
						) : (
							<div className="wallet-options connector-container">
								{connectors.map((connector) => (
									<button
										key={connector.id}
										className="dropdown-button"
										onClick={() => handleConnect(connector)}
										disabled={isPending}
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "8px",
											width: "100%",
										}}
									>
										{isPending ? (
											<span className="loading-spinner"></span>
										) : null}
										<span>{connector.name}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{error && (
						<div
							className="step-card"
							style={{ color: "#ff6464", marginTop: "16px" }}
						>
							<p>Error: {error.message}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default WalletConnectModal;
