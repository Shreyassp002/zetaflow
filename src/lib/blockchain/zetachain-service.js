/**
 * @fileoverview ZetaChain Service - Application wrapper for unified ZetaChain API
 * Provides network switching, data normalization, error handling, and caching
 */

import { ZetaChainAPI } from "./zetachain-api.js";

// Known token contracts on ZetaChain (mainnet and testnet)
const KNOWN_TOKENS = {
  // ZetaChain Mainnet (7000) - Updated with actual addresses and symbols
  '0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf': { symbol: 'USDC.ETH', name: 'USD Coin (Ethereum)', decimals: 6 },
  '0x7c8dda80bbbe1254a7aacf3219ebe1481c6e01d7': { symbol: 'USDT.ETH', name: 'Tether USD (Ethereum)', decimals: 6 },
  '0x48f80608b672dc30dc7e3dbbd0343c5f02c738eb': { symbol: 'BNB.BSC', name: 'BNB (BSC)', decimals: 18 },
  '0xd97b1de3619ed2c6beb3860147e30ca8a7dc9891': { symbol: 'ETH.ETH', name: 'ETH (Ethereum)', decimals: 18 },
  '0x91d4f0d54090df2d81e834c3c8ce71c6c3461d93': { symbol: 'WBTC.ETH', name: 'Wrapped Bitcoin', decimals: 8 },
  '0x05ba149a7bd6dc1f937fa9046a9e05c05f3b18b0': { symbol: 'USDC.BSC', name: 'USD Coin (BSC)', decimals: 18 },
  '0x7c125c1ccf65c5c35dba7a5cb8b8c0b5b1b4c7a0': { symbol: 'USDT.BSC', name: 'Tether USD (BSC)', decimals: 18 },
  
  // ZetaChain Testnet (7001)
  '0x0cbe0df132a6c6b4a2974fa1b7fb953cf0cc798a': { symbol: 'USDC.ETH', name: 'USD Coin (Ethereum)', decimals: 6 },
};

// Common DEX/Swap contract addresses and their information
const DEX_CONTRACTS = {
  // ZetaSwap and other DEX contracts on ZetaChain
  '0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe': { name: 'ZetaSwap', type: 'swap' },
  '0x91d4F0D54090Df2D81e834c3c8CE71C6c3461d93': { name: 'ZetaSwap Pool', type: 'pool' },
  // Add more as discovered
};

// Swap method signatures for detecting swap transactions
const SWAP_METHOD_SIGNATURES = {
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapTokensForExactETH',
  '0x791ac947': 'swapExactTokensForETH',
  '0x4a25d94a': 'swapTokensForExactTokens',
  '0x022c0d9f': 'swap', // Uniswap V2 style
};

/**
 * Custom error class for ZetaChain service operations
 */
export class ZetaChainServiceError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = "ZetaChainServiceError";
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * Error types for ZetaChain service
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  API_RATE_LIMIT: "API_RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

/**
 * ZetaChain service wrapper for application integration
 * Wraps ZetaChainAPI with application-specific functionality
 */
export class ZetaChainService {
  constructor() {
    this.api = new ZetaChainAPI();
    this.currentNetwork = "mainnet"; // Default to mainnet
    this.cache = new Map(); // Simple in-memory cache
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffFactor: 2,
    };
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffFactor, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Execute a function with retry logic and error handling
   * @param {Function} fn - Function to execute
   * @param {string} operation - Operation name for error messages
   * @returns {Promise<any>} Function result
   */
  async executeWithRetry(fn, operation) {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          throw this.wrapError(error, operation);
        }

        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxRetries) {
          throw this.wrapError(error, operation);
        }

        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt);
        console.warn(
          `${operation} failed (attempt ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          }), retrying in ${delay}ms:`,
          error.message
        );
        await this.sleep(delay);
      }
    }

    throw this.wrapError(lastError, operation);
  }

  /**
   * Check if an error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} True if error should not be retried
   */
  isNonRetryableError(error) {
    const message = error.message.toLowerCase();

    // Don't retry on validation errors or not found errors
    if (
      message.includes("invalid") ||
      message.includes("not found") ||
      message.includes("400") ||
      message.includes("404")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Wrap an error with additional context
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {ZetaChainServiceError} Wrapped error
   */
  wrapError(error, operation) {
    let errorType = ERROR_TYPES.UNKNOWN;

    if (error.message.includes("fetch")) {
      errorType = ERROR_TYPES.NETWORK_ERROR;
    } else if (error.message.includes("not found")) {
      errorType = ERROR_TYPES.TRANSACTION_NOT_FOUND;
    } else if (error.message.includes("timeout")) {
      errorType = ERROR_TYPES.TIMEOUT;
    } else if (error.message.includes("rate limit")) {
      errorType = ERROR_TYPES.API_RATE_LIMIT;
    }

    return new ZetaChainServiceError(
      `${operation} failed: ${error.message}`,
      errorType,
      error
    );
  }

  /**
   * Generate cache key for requests
   * @param {string} method - Method name
   * @param {...any} args - Method arguments
   * @returns {string} Cache key
   */
  getCacheKey(method, ...args) {
    return `${method}:${this.currentNetwork}:${JSON.stringify(args)}`;
  }

  /**
   * Get cached result or execute function and cache result
   * @param {string} cacheKey - Cache key
   * @param {Function} fn - Function to execute if not cached
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns {Promise<any>} Cached or fresh result
   */
  async getCachedOrExecute(cacheKey, fn, ttl = 5 * 60 * 1000) {
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const result = await fn();
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Clear cache entries (useful for network switching)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Set the current network for subsequent operations
   * @param {'mainnet'|'testnet'} network - Network to switch to
   */
  setNetwork(network) {
    if (network !== "mainnet" && network !== "testnet") {
      throw new ZetaChainServiceError(
        `Invalid network: ${network}. Must be 'mainnet' or 'testnet'`,
        ERROR_TYPES.INVALID_INPUT
      );
    }

    if (this.currentNetwork !== network) {
      this.currentNetwork = network;
      this.clearCache(); // Clear cache when switching networks
    }
  }

  /**
   * Get current network
   * @returns {'mainnet'|'testnet'}
   */
  getCurrentNetwork() {
    return this.currentNetwork;
  }

  /**
   * Get transaction data with automatic type detection
   * @param {string} txHashOrUrl - Transaction hash or ZetaScan URL
   * @returns {Promise<Object>} Normalized transaction data
   */
  async getTransaction(txHashOrUrl) {
    if (!txHashOrUrl || typeof txHashOrUrl !== "string") {
      throw new ZetaChainServiceError(
        "Transaction hash or URL is required",
        ERROR_TYPES.INVALID_INPUT
      );
    }

    const cacheKey = this.getCacheKey("getTransaction", txHashOrUrl);

    return this.getCachedOrExecute(cacheKey, async () => {
      return this.executeWithRetry(async () => {
        const isMainnet = this.currentNetwork === "mainnet";

        // Handle both direct hash and ZetaScan URLs
        if (txHashOrUrl.includes("zetascan.com")) {
          const rawData = await this.api.getTransaction(txHashOrUrl);
          const detection = this.api.detectTransactionType(txHashOrUrl);

          if (detection.isCrossChain) {
            return this.normalizeCrossChainTransaction(rawData);
          } else {
            return this.normalizeEVMTransaction(rawData.result || rawData);
          }
        } else {
          // Direct hash - try EVM first, then cross-chain
          try {
            const [evmResult, receiptResult] = await Promise.all([
              this.api.getEVMTransaction(txHashOrUrl, isMainnet),
              this.api.getEVMTransactionReceipt(txHashOrUrl, isMainnet).catch(() => null)
            ]);
            
            if (evmResult.result) {
              return await this.normalizeEVMTransaction(evmResult.result, receiptResult?.result);
            }
          } catch (error) {
            console.log("EVM transaction not found, trying cross-chain...");
          }

          // If EVM fails, try cross-chain
          const ccResult = await this.api.getCrossChainTransaction(
            txHashOrUrl,
            isMainnet
          );
          return this.normalizeCrossChainTransaction(ccResult);
        }
      }, "getTransaction");
    });
  }

  /**
   * Get transaction with receipt data for EVM transactions
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction with receipt data
   */
  async getTransactionWithReceipt(txHash) {
    if (!txHash || typeof txHash !== "string") {
      throw new ZetaChainServiceError(
        "Transaction hash is required",
        ERROR_TYPES.INVALID_INPUT
      );
    }

    const cacheKey = this.getCacheKey("getTransactionWithReceipt", txHash);

    return this.getCachedOrExecute(cacheKey, async () => {
      return this.executeWithRetry(async () => {
        const isMainnet = this.currentNetwork === "mainnet";

        try {
          const [txResult, receiptResult] = await Promise.all([
            this.api.getEVMTransaction(txHash, isMainnet),
            this.api.getEVMTransactionReceipt(txHash, isMainnet),
          ]);

          if (txResult.result && receiptResult.result) {
            return await this.normalizeEVMTransaction(txResult.result, receiptResult.result);
          }
        } catch (error) {
          // Fallback to cross-chain if EVM fails
          const ccResult = await this.api.getCrossChainTransaction(
            txHash,
            isMainnet
          );
          return this.normalizeCrossChainTransaction(ccResult);
        }
      }, "getTransactionWithReceipt");
    });
  }

  /**
   * Parse token transfers from transaction receipt logs
   * @param {Array} logs - Transaction receipt logs
   * @returns {Array} Parsed token transfers
   */
  parseTokenTransfers(logs) {
    if (!logs || !Array.isArray(logs)) return [];

    const transfers = [];
    
    // ERC-20 Transfer event signature: Transfer(address,address,uint256)
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    
    for (const log of logs) {
      if (log.topics && log.topics[0] === transferEventSignature && log.topics.length >= 3) {
        try {
          // Parse ERC-20 transfer
          const from = '0x' + log.topics[1].slice(26); // Remove padding
          const to = '0x' + log.topics[2].slice(26); // Remove padding
          const amount = log.data ? parseInt(log.data, 16).toString() : '0';
          
          transfers.push({
            type: 'ERC20',
            tokenAddress: log.address,
            from: from,
            to: to,
            amount: amount,
            rawAmount: amount,
            logIndex: log.logIndex ? parseInt(log.logIndex, 16) : 0,
          });
        } catch (error) {
          console.warn('Failed to parse transfer log:', error);
        }
      }
    }
    
    return transfers;
  }

  /**
   * Format token amount with proper decimals
   * @param {string} rawAmount - Raw token amount
   * @param {number} decimals - Token decimals
   * @returns {string} Formatted amount
   */
  formatTokenAmount(rawAmount, decimals = 18) {
    if (!rawAmount || rawAmount === '0') return '0';
    
    const amount = parseFloat(rawAmount) / Math.pow(10, decimals);
    
    if (amount < 0.000001) {
      return amount.toExponential(3);
    } else if (amount < 1) {
      return amount.toFixed(6);
    } else {
      return amount.toFixed(4);
    }
  }

  /**
   * Fetch token metadata from contract
   * @param {string} tokenAddress - Token contract address
   * @param {boolean} isMainnet - Whether to use mainnet RPC
   * @returns {Promise<Object>} Token metadata
   */
  async fetchTokenMetadata(tokenAddress, isMainnet = true) {
    const rpcUrl = isMainnet 
      ? "https://zetachain-evm.blockpi.network/v1/rpc/public"
      : "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";

    try {
      // ERC-20 function signatures
      const symbolSig = '0x95d89b41'; // symbol()
      const nameSig = '0x06fdde03';   // name()
      const decimalsSig = '0x313ce567'; // decimals()

      const [symbolResult, nameResult, decimalsResult] = await Promise.all([
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: tokenAddress, data: symbolSig }, 'latest'],
            id: 1
          })
        }).then(r => r.json()),
        
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: tokenAddress, data: nameSig }, 'latest'],
            id: 2
          })
        }).then(r => r.json()),
        
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: tokenAddress, data: decimalsSig }, 'latest'],
            id: 3
          })
        }).then(r => r.json())
      ]);

      // Decode the results
      const symbol = this.decodeStringResult(symbolResult.result);
      const name = this.decodeStringResult(nameResult.result);
      const decimals = decimalsResult.result ? parseInt(decimalsResult.result, 16) : 18;

      return {
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        decimals: decimals
      };
    } catch (error) {
      console.warn(`Failed to fetch token metadata for ${tokenAddress}:`, error);
      return {
        symbol: `Token-${tokenAddress.slice(0, 6)}`,
        name: 'Unknown Token',
        decimals: 18
      };
    }
  }

  /**
   * Decode string result from contract call
   * @param {string} hexResult - Hex encoded result
   * @returns {string} Decoded string
   */
  decodeStringResult(hexResult) {
    if (!hexResult || hexResult === '0x') return '';
    
    try {
      // Remove 0x prefix
      const hex = hexResult.slice(2);
      
      // Get the length from bytes 32-63 (characters 64-127)
      const lengthHex = hex.slice(64, 128);
      const length = parseInt(lengthHex, 16);
      
      // Get the actual string data starting from byte 64 (character 128)
      const dataHex = hex.slice(128, 128 + (length * 2));
      
      // Convert hex to string
      let result = '';
      for (let i = 0; i < dataHex.length; i += 2) {
        const byte = parseInt(dataHex.substr(i, 2), 16);
        if (byte === 0) break; // Stop at null terminator
        result += String.fromCharCode(byte);
      }
      
      return result;
    } catch (error) {
      console.warn('Failed to decode string result:', error);
      return '';
    }
  }

  /**
   * Try to identify unknown tokens based on address patterns or common contracts
   * @param {string} tokenAddress - Token contract address
   * @returns {Object} Token info or null
   */
  identifyUnknownToken(tokenAddress) {
    const addr = tokenAddress.toLowerCase();
    
    // Common patterns for wrapped tokens
    if (addr.includes('weth') || addr.endsWith('eth')) {
      return { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 };
    }
    
    if (addr.includes('wzeta') || addr.includes('zeta')) {
      return { symbol: 'WZETA', name: 'Wrapped ZETA', decimals: 18 };
    }
    
    if (addr.includes('usdc')) {
      return { symbol: 'USDC', name: 'USD Coin', decimals: 6 };
    }
    
    if (addr.includes('usdt')) {
      return { symbol: 'USDT', name: 'Tether USD', decimals: 6 };
    }
    
    // Return null if no pattern matches
    return null;
  }

  /**
   * Detect if transaction is a swap operation
   * @param {string} to - Transaction recipient address
   * @param {string} input - Transaction input data
   * @param {Array} tokenTransfers - Parsed token transfers
   * @returns {Object|null} Swap information or null
   */
  detectSwapOperation(to, input, tokenTransfers) {
    if (!input || input.length < 10) return null;
    
    const methodSignature = input.slice(0, 10);
    const swapMethod = SWAP_METHOD_SIGNATURES[methodSignature];
    const dexInfo = DEX_CONTRACTS[to];
    
    if (swapMethod || dexInfo) {
      // Analyze token transfers to determine swap details
      if (tokenTransfers.length >= 2) {
        const fromTransfer = tokenTransfers.find(t => t.from.toLowerCase() === to?.toLowerCase());
        const toTransfer = tokenTransfers.find(t => t.to.toLowerCase() === to?.toLowerCase());
        
        return {
          isSwap: true,
          method: swapMethod || 'swap',
          dexName: dexInfo?.name || 'Unknown DEX',
          tokenIn: fromTransfer ? {
            symbol: fromTransfer.tokenSymbol,
            amount: fromTransfer.amount,
            address: fromTransfer.tokenAddress
          } : null,
          tokenOut: toTransfer ? {
            symbol: toTransfer.tokenSymbol,
            amount: toTransfer.amount,
            address: toTransfer.tokenAddress
          } : null,
        };
      }
    }
    
    return null;
  }

  /**
   * Normalize EVM transaction data to application format
   * @param {Object} evmTx - Raw EVM transaction data
   * @param {Object} [receipt] - Transaction receipt data
   * @returns {Promise<Object>} Normalized transaction data
   */
  async normalizeEVMTransaction(evmTx, receipt = null) {
    const chainId = evmTx.chainId
      ? parseInt(evmTx.chainId, 16)
      : this.currentNetwork === "mainnet"
      ? 7000
      : 7001;

    // Determine if this is a contract interaction
    const isContractInteraction = evmTx.input && evmTx.input !== "0x" && evmTx.input.length > 2;
    
    // Parse token transfers from receipt logs
    const tokenTransfers = receipt ? this.parseTokenTransfers(receipt.logs) : [];
    
    // Format token transfers with real token metadata
    const formattedTransfers = await Promise.all(
      tokenTransfers.map(async (transfer) => {
        const tokenAddress = transfer.tokenAddress.toLowerCase();
        let tokenInfo = KNOWN_TOKENS[tokenAddress];
        
        // If not in our database, fetch from contract
        if (!tokenInfo) {
          tokenInfo = await this.fetchTokenMetadata(transfer.tokenAddress, chainId === 7000);
        }
        
        const decimals = tokenInfo?.decimals || 18;
        const symbol = tokenInfo?.symbol || `Token-${tokenAddress.slice(0, 6)}`;
        const name = tokenInfo?.name || 'Unknown Token';
        
        return {
          ...transfer,
          amount: this.formatTokenAmount(transfer.rawAmount, decimals),
          tokenSymbol: symbol,
          tokenName: name,
          tokenDecimals: decimals,
          isKnownToken: !!KNOWN_TOKENS[tokenAddress],
        };
      })
    );
    
    // Detect swap operations
    const swapInfo = this.detectSwapOperation(evmTx.to, evmTx.input, formattedTransfers);
    
    return {
      txHash: evmTx.hash,
      blockNumber: evmTx.blockNumber ? parseInt(evmTx.blockNumber, 16) : 0,
      timestamp: Date.now(), // Would need block data for actual timestamp
      from: evmTx.from,
      to: evmTx.to || "Contract Creation",
      value: evmTx.value,
      gasUsed: receipt ? receipt.gasUsed : evmTx.gas,
      gasPrice: evmTx.gasPrice,
      status: receipt 
        ? (receipt.status === "0x1" ? "success" : "failed")
        : "pending",
      chainId: chainId,
      type: "evm",
      network: this.currentNetwork,
      tokenTransfers: formattedTransfers,
      swapInfo: swapInfo,
      evmData: {
        nonce: evmTx.nonce ? parseInt(evmTx.nonce, 16) : 0,
        transactionIndex: evmTx.transactionIndex ? parseInt(evmTx.transactionIndex, 16) : 0,
        gasLimit: evmTx.gas ? parseInt(evmTx.gas, 16) : 0,
        effectiveGasPrice: receipt?.effectiveGasPrice || evmTx.gasPrice,
        isContractInteraction: isContractInteraction,
        inputData: evmTx.input,
        blockHash: evmTx.blockHash,
      },
    };
  }

  /**
   * Normalize cross-chain transaction data to application format
   * @param {Object} ccTx - Raw cross-chain transaction data
   * @returns {Object} Normalized transaction data
   */
  normalizeCrossChainTransaction(ccTx) {
    // Handle the actual API response structure
    const cctx = ccTx.CrossChainTx || ccTx.cctx || ccTx;
    const inboundParams = cctx.inbound_params || cctx.inbound_tx_params || {};
    const outboundParams = cctx.outbound_params?.[0] || cctx.outbound_tx_params?.[0] || {};
    const status = cctx.cctx_status?.status;

    // Parse timestamp from the API response
    const timestamp = cctx.cctx_status?.created_timestamp 
      ? parseInt(cctx.cctx_status.created_timestamp) * 1000 
      : Date.now();

    return {
      txHash: cctx.index || "unknown",
      blockNumber: inboundParams.observed_external_height 
        ? parseInt(inboundParams.observed_external_height) 
        : 0,
      timestamp: timestamp,
      from: inboundParams.sender || "unknown",
      to: outboundParams.receiver || "unknown",
      value: inboundParams.amount || "0",
      gasUsed: outboundParams.gas_used || inboundParams.gas_limit || "0",
      gasPrice: outboundParams.gas_price || inboundParams.gas_price || "0",
      status: this.mapCrossChainStatus(status),
      chainId: inboundParams.sender_chain_id 
        ? parseInt(inboundParams.sender_chain_id) 
        : 0,
      type: "cross-chain",
      network: this.currentNetwork,
      crossChainData: {
        sourceChain: inboundParams.sender_chain_id 
          ? parseInt(inboundParams.sender_chain_id) 
          : undefined,
        destinationChain: outboundParams.receiver_chainId 
          ? parseInt(outboundParams.receiver_chainId) 
          : undefined,
        status: this.mapCrossChainStatus(status),
        bridgeContract: inboundParams.coin_type || "unknown",
        crossChainTxHash: outboundParams.hash || outboundParams.outbound_tx_hash,
        inboundTxHash: inboundParams.observed_hash,
        statusMessage: cctx.cctx_status?.status_message || "",
        errorMessage: cctx.cctx_status?.error_message || "",
      },
    };
  }

  /**
   * Map cross-chain status to application status
   * @param {string|number} status - Cross-chain status code or string
   * @returns {'success'|'pending'|'failed'}
   */
  mapCrossChainStatus(status) {
    if (typeof status === 'string') {
      switch (status.toLowerCase()) {
        case 'outboundmined':
        case 'success':
          return "success";
        case 'pendinginbound':
        case 'pendingoutbound':
        case 'pending':
          return "pending";
        case 'aborted':
        case 'reverted':
        case 'failed':
          return "failed";
        default:
          return "pending";
      }
    }
    
    // Handle numeric status codes
    switch (status) {
      case 3:
        return "success"; // OutboundMined
      case 1:
      case 2:
        return "pending"; // PendingInbound, PendingOutbound
      case 4:
        return "failed"; // Aborted
      case 5:
        return "failed"; // Reverted
      default:
        return "pending";
    }
  }

  /**
   * Get network information for current network
   * @returns {Object} Network configuration
   */
  getNetworkInfo() {
    return {
      network: this.currentNetwork,
      chainId: this.currentNetwork === "mainnet" ? 7000 : 7001,
      name:
        this.currentNetwork === "mainnet"
          ? "ZetaChain Mainnet"
          : "ZetaChain Athens-3 Testnet",
      rpcUrl:
        this.currentNetwork === "mainnet"
          ? "https://zetachain-evm.blockpi.network/v1/rpc/public"
          : "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      explorerUrl:
        this.currentNetwork === "mainnet"
          ? "https://zetascan.com"
          : "https://testnet.zetascan.com",
      nativeCurrency: {
        name: "ZETA",
        symbol: "ZETA",
        decimals: 18,
      },
    };
  }

  /**
   * Detect transaction type from URL or hash
   * @param {string} input - Transaction hash or ZetaScan URL
   * @returns {Object} Detection result
   */
  detectTransactionType(input) {
    if (input.includes("zetascan.com")) {
      return this.api.detectTransactionType(input);
    }

    // For direct hash, we can't determine type without trying both APIs
    return {
      isMainnet: this.currentNetwork === "mainnet",
      isCrossChain: null, // Unknown until we try the APIs
      txHash: input,
      network: this.currentNetwork,
      type: "unknown",
    };
  }
}

// Export singleton instance for application use
export const zetaChainService = new ZetaChainService();
