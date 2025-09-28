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
    if (!amount) return "N/A";
    return parseFloat(amount).toFixed(6);
  };

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Transaction Details
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Transaction Hash
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-gray-900 break-all">
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Amount
              </label>
              <span className="text-sm text-gray-900">
                {formatAmount(transaction.value)}{" "}
                {transaction.tokenSymbol || "ETH"}
              </span>
            </div>

            {/* From Address */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                From
              </label>
              <span className="text-sm font-mono text-gray-900">
                {formatAddress(transaction.from)}
              </span>
            </div>

            {/* To Address */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                To
              </label>
              <span className="text-sm font-mono text-gray-900">
                {formatAddress(transaction.to)}
              </span>
            </div>

            {/* Chain Info */}
            {transaction.chainId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Chain
                </label>
                <span className="text-sm text-gray-900">
                  {transaction.chainName || `Chain ${transaction.chainId}`}
                </span>
              </div>
            )}

            {/* Block Number */}
            {transaction.blockNumber && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Block
                </label>
                <span className="text-sm text-gray-900">
                  {transaction.blockNumber}
                </span>
              </div>
            )}

            {/* Gas Used */}
            {transaction.gasUsed && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Gas Used
                </label>
                <span className="text-sm text-gray-900">
                  {transaction.gasUsed}
                </span>
              </div>
            )}

            {/* Timestamp */}
            {transaction.timestamp && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Time
                </label>
                <span className="text-sm text-gray-900">
                  {new Date(transaction.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>No transaction selected</p>
            <p className="text-xs mt-1">
              Click on a transaction to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
