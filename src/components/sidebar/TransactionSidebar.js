import { X, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react";

/**
 * Simple transaction sidebar component
 * @param {Object} props
 * @param {Object|null} props.transaction - Transaction data to display
 * @param {boolean} props.isOpen - Whether sidebar is open
 * @param {function} props.onClose - Function to close sidebar
 */
export default function TransactionSidebar({ transaction, isOpen, onClose }) {
  if (!isOpen) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatAmount = (amount) => {
    if (!amount || amount === "0") return "0";
    
    try {
      // Convert from wei to ether (assuming 18 decimals)
      const value = parseFloat(amount) / Math.pow(10, 18);
      if (value < 0.0001) return `< 0.0001`;
      if (value < 1) return value.toFixed(6);
      return value.toFixed(4);
    } catch {
      return amount;
    }
  };

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId) => {
    const chainNames = {
      1: "Ethereum Mainnet",
      56: "BNB Chain (BSC)",
      137: "Polygon",
      8453: "Base",
      7000: "ZetaChain Mainnet", 
      7001: "ZetaChain Athens Testnet",
      11155111: "Sepolia Testnet",
      97: "BNB Testnet (BSC)",
      80001: "Mumbai Testnet",
      84531: "Base Goerli",
      // Add hex versions for safety
      "0x1b58": "ZetaChain Mainnet", // 7000 in hex
      "0x1b59": "ZetaChain Athens Testnet", // 7001 in hex
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-lg z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Transaction Details
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
        {transaction ? (
          <>
            {/* Status */}
            <div className="flex items-center space-x-2">
              {getStatusIcon(transaction.status)}
              <span className="text-sm font-medium capitalize">
                {transaction.status || "Unknown"}
              </span>
            </div>

            {/* Transaction Hash */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Transaction Hash
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-white break-all">
                  {transaction.txHash || "N/A"}
                </span>
                {transaction.explorerUrl && (
                  <a
                    href={transaction.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Amount
              </label>
              <span className="text-sm text-white">
                {formatAmount(transaction.value)}{" "}
                {transaction.type === "cross-chain" 
                  ? (transaction.crossChainData?.bridgeContract === "Gas" ? "ZETA" : "ZETA")
                  : (transaction.chainId === 7000 || transaction.chainId === 7001 ? "ZETA" : "ETH")
                }
              </span>
            </div>

            {/* From Address */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                From
              </label>
              <span className="text-sm font-mono text-white">
                {formatAddress(transaction.from)}
              </span>
            </div>

            {/* To Address */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                To
              </label>
              <span className="text-sm font-mono text-white">
                {formatAddress(transaction.to)}
              </span>
            </div>

            {/* Chain Info */}
            {transaction.chainId && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Chain
                </label>
                <span className="text-sm text-white">
                  {transaction.chainName || `Chain ${transaction.chainId}`}
                </span>
              </div>
            )}

            {/* Block Number */}
            {transaction.blockNumber && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Block
                </label>
                <span className="text-sm text-white">
                  {transaction.blockNumber}
                </span>
              </div>
            )}

            {/* Gas Used */}
            {transaction.gasUsed && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Gas Used
                </label>
                <span className="text-sm text-white">
                  {transaction.gasUsed}
                </span>
              </div>
            )}

            {/* Timestamp */}
            {transaction.timestamp && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Time
                </label>
                <span className="text-sm text-white">
                  {typeof transaction.timestamp === 'number' 
                    ? new Date(transaction.timestamp > 1000000000000 ? transaction.timestamp : transaction.timestamp * 1000).toLocaleString()
                    : transaction.timestamp}
                </span>
              </div>
            )}

            {/* Cross-chain Data */}
            {transaction.crossChainData && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Source Chain
                  </label>
                  <span className="text-sm text-white">
                    {transaction.crossChainData.sourceChain 
                      ? getChainName(transaction.crossChainData.sourceChain)
                      : "Unknown"}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Destination Chain
                  </label>
                  <span className="text-sm text-white">
                    {transaction.crossChainData.destinationChain 
                      ? getChainName(transaction.crossChainData.destinationChain)
                      : "Unknown"}
                  </span>
                </div>
              </>
            )}

            {/* Network Info */}
            {transaction.network && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Network
                </label>
                <span className="text-sm text-white capitalize">
                  {transaction.network}
                </span>
              </div>
            )}

            {/* Transaction Type */}
            {transaction.type && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Type
                </label>
                <span className="text-sm text-white capitalize">
                  {transaction.type === 'cross-chain' ? 'Cross-Chain' : 'EVM'}
                </span>
              </div>
            )}

            {/* EVM specific fields */}
            {transaction.evmData && (
              <>
                {/* Nonce */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Nonce
                  </label>
                  <span className="text-sm text-white">
                    {transaction.evmData.nonce}
                  </span>
                </div>

                {/* Transaction Index */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Transaction Index
                  </label>
                  <span className="text-sm text-white">
                    {transaction.evmData.transactionIndex}
                  </span>
                </div>

                {/* Gas Limit */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Gas Limit
                  </label>
                  <span className="text-sm text-white">
                    {transaction.evmData.gasLimit?.toLocaleString()}
                  </span>
                </div>

                {/* Contract Interaction */}
                {transaction.evmData.isContractInteraction && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Contract Interaction
                    </label>
                    <span className="text-sm text-green-400">
                      Yes
                    </span>
                  </div>
                )}

                {/* Input Data */}
                {transaction.evmData.inputData && transaction.evmData.inputData !== "0x" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Input Data
                    </label>
                    <span className="text-xs font-mono text-white break-all">
                      {transaction.evmData.inputData.slice(0, 100)}
                      {transaction.evmData.inputData.length > 100 && "..."}
                    </span>
                  </div>
                )}

                {/* Block Hash */}
                {transaction.evmData.blockHash && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Block Hash
                    </label>
                    <span className="text-xs font-mono text-white break-all">
                      {transaction.evmData.blockHash}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Cross-chain specific fields */}
            {transaction.crossChainData && (
              <>
                {/* Inbound Transaction Hash */}
                {transaction.crossChainData.inboundTxHash && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Inbound Tx Hash
                    </label>
                    <span className="text-sm font-mono text-white break-all">
                      {transaction.crossChainData.inboundTxHash}
                    </span>
                  </div>
                )}

                {/* Outbound Transaction Hash */}
                {transaction.crossChainData.crossChainTxHash && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Outbound Tx Hash
                    </label>
                    <span className="text-sm font-mono text-white break-all">
                      {transaction.crossChainData.crossChainTxHash}
                    </span>
                  </div>
                )}

                {/* Bridge Contract/Coin Type */}
                {transaction.crossChainData.bridgeContract && transaction.crossChainData.bridgeContract !== 'unknown' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Asset Type
                    </label>
                    <span className="text-sm text-white">
                      {transaction.crossChainData.bridgeContract}
                    </span>
                  </div>
                )}

                {/* Status Message */}
                {transaction.crossChainData.statusMessage && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Status Message
                    </label>
                    <span className="text-sm text-white">
                      {transaction.crossChainData.statusMessage}
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {transaction.crossChainData.errorMessage && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Error Message
                    </label>
                    <span className="text-sm text-red-400">
                      {transaction.crossChainData.errorMessage}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400 mt-8">
            <p>No transaction selected</p>
            <p className="text-xs mt-1">
              Search for a transaction to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
