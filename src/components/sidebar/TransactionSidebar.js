'use client';

import { useState } from 'react';

/**
 * TransactionSidebar Component
 * Enhanced sidebar for displaying transaction details with copy functionality,
 * hover tooltips, better formatting, and chain name mapping
 */

// Chain ID to name mapping
const CHAIN_NAMES = {
  7000: 'ZetaChain Mainnet',
  7001: 'ZetaChain Testnet',
  1: 'Ethereum',
  56: 'BSC',
  137: 'Polygon',
  43114: 'Avalanche',
  250: 'Fantom',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base'
};

// Chain ID to native token mapping
const CHAIN_TOKENS = {
  7000: 'ZETA',
  7001: 'ZETA',
  1: 'ETH',
  56: 'BNB',
  137: 'POL', // Polygon's native token (formerly MATIC)
  43114: 'AVAX',
  250: 'FTM',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH'
};

// Copy to clipboard utility
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Copyable field component
const CopyableField = ({ label, value, fullValue, className = "" }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(fullValue || value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
        {label}
      </label>
      <div className="flex items-center">
        <span 
          className="text-sm font-mono text-black cursor-pointer hover:text-blue-600 transition-colors"
          title={fullValue || value}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {value}
        </span>
        <button
          onClick={handleCopy}
          className="ml-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Tooltip for full value */}
      {showTooltip && fullValue && fullValue !== value && (
        <div className="absolute z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded mt-1 max-w-xs break-all">
          {fullValue}
        </div>
      )}
    </div>
  );
};

// Format timestamp with timezone
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  let date;
  if (typeof timestamp === 'number') {
    // Handle both seconds and milliseconds timestamps
    date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return "Invalid Date";
  
  // Format with timezone
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  
  return date.toLocaleString('en-US', options);
};

// Get chain name from ID
const getChainName = (chainId) => {
  if (!chainId) return "Unknown Chain";
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
};

// Get token symbol for a chain
const getTokenSymbol = (transaction) => {
  // If transaction has token information, use that
  if (transaction.tokenSymbol) {
    return transaction.tokenSymbol;
  }
  
  // If it's a cross-chain transaction, try to determine from source chain
  if (transaction.crossChainData && transaction.crossChainData.sourceChain) {
    return CHAIN_TOKENS[transaction.crossChainData.sourceChain] || 'UNKNOWN';
  }
  
  // Use chain ID to determine native token
  if (transaction.chainId) {
    return CHAIN_TOKENS[transaction.chainId] || 'UNKNOWN';
  }
  
  // Default fallback
  return 'ZETA';
};

// Format amount with proper decimals based on token
const formatAmount = (value, tokenSymbol) => {
  if (!value || value === '0') return `0 ${tokenSymbol}`;
  
  // Most tokens use 18 decimals, but some use different amounts
  const decimals = getTokenDecimals(tokenSymbol);
  const amount = parseFloat(value) / Math.pow(10, decimals);
  
  // Format with appropriate precision
  if (amount < 0.000001) {
    return `${amount.toExponential(3)} ${tokenSymbol}`;
  } else if (amount < 1) {
    return `${amount.toFixed(6)} ${tokenSymbol}`;
  } else {
    return `${amount.toFixed(4)} ${tokenSymbol}`;
  }
};

// Get token decimals
const getTokenDecimals = (tokenSymbol) => {
  const tokenDecimals = {
    'USDC': 6,
    'USDT': 6,
    'BTC': 8,
    'WBTC': 8
  };
  
  return tokenDecimals[tokenSymbol] || 18; // Default to 18 decimals
};

export default function TransactionSidebar({ transaction }) {
  if (!transaction) {
    return (
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 h-full shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-black">
          Transaction Details
        </h2>
        <div className="text-center text-gray-500 mt-8">
          <div className="w-12 h-12 mx-auto mb-3 border-2 border-gray-300 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border border-gray-300 rounded"></div>
          </div>
          <p className="text-sm">No transaction selected</p>
          <p className="text-xs mt-1">
            Click on graph nodes or edges to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4 h-full shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-black">
        Transaction Details
      </h2>
      
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
        {/* Transaction Hash */}
        <CopyableField
          label="Transaction Hash"
          value={transaction.txHash ? 
            `${transaction.txHash.slice(0, 10)}...${transaction.txHash.slice(-8)}` : 
            "N/A"
          }
          fullValue={transaction.txHash}
        />

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Status
          </label>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              transaction.status === 'success' ? 'bg-green-500' :
              transaction.status === 'pending' ? 'bg-yellow-500' :
              transaction.status === 'failed' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
            <span className={`text-sm font-medium capitalize ${
              transaction.status === 'success' ? 'text-green-600' :
              transaction.status === 'pending' ? 'text-yellow-600' :
              transaction.status === 'failed' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {transaction.status || "Unknown"}
            </span>
          </div>
        </div>

        {/* From Address */}
        <CopyableField
          label="From Address"
          value={transaction.from ? 
            `${transaction.from.slice(0, 6)}...${transaction.from.slice(-4)}` : 
            "N/A"
          }
          fullValue={transaction.from}
        />

        {/* To Address */}
        <CopyableField
          label="To Address"
          value={transaction.to ? 
            `${transaction.to.slice(0, 6)}...${transaction.to.slice(-4)}` : 
            "N/A"
          }
          fullValue={transaction.to}
        />

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Amount
          </label>
          <span className="text-sm text-black font-medium">
            {formatAmount(transaction.value, getTokenSymbol(transaction))}
          </span>
        </div>

        {/* Gas Information */}
        {(transaction.gasUsed || transaction.gasPrice) && (
          <div className="grid grid-cols-2 gap-4">
            {transaction.gasUsed && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Gas Used
                </label>
                <span className="text-sm text-black">
                  {parseInt(transaction.gasUsed).toLocaleString()}
                </span>
              </div>
            )}
            {transaction.gasPrice && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Gas Price
                </label>
                <span className="text-sm text-black">
                  {(parseFloat(transaction.gasPrice) / Math.pow(10, 9)).toFixed(2)} Gwei
                </span>
              </div>
            )}
          </div>
        )}

        {/* Block Information */}
        {transaction.blockNumber && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Block Number
              </label>
              <span className="text-sm text-black">
                {parseInt(transaction.blockNumber).toLocaleString()}
              </span>
            </div>
            {transaction.transactionIndex !== undefined && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  TX Index
                </label>
                <span className="text-sm text-black">
                  {transaction.transactionIndex}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chain Information */}
        {transaction.chainId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Chain
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black font-medium">
                {getChainName(transaction.chainId)}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                ID: {transaction.chainId}
              </span>
            </div>
          </div>
        )}

        {/* Cross-chain Information */}
        {transaction.crossChainData && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Cross-Chain Details</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Source Chain
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black">
                    {getChainName(transaction.crossChainData.sourceChain)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {transaction.crossChainData.sourceChain}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Destination Chain
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black">
                    {getChainName(transaction.crossChainData.destinationChain)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {transaction.crossChainData.destinationChain}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {transaction.timestamp && (
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Timestamp
            </label>
            <span className="text-sm text-black">
              {formatTimestamp(transaction.timestamp)}
            </span>
          </div>
        )}

        {/* Transaction Fee */}
        {transaction.gasUsed && transaction.gasPrice && (
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Transaction Fee
            </label>
            <span className="text-sm text-black font-medium">
              {formatAmount(
                (parseFloat(transaction.gasUsed) * parseFloat(transaction.gasPrice)).toString(),
                'ZETA'
              )}
            </span>
          </div>
        )}

        {/* Confirmations */}
        {transaction.confirmations && (
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Confirmations
            </label>
            <span className="text-sm text-black">
              {parseInt(transaction.confirmations).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}