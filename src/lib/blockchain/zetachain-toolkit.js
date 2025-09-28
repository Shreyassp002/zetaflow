/**
 * @fileoverview ZetaChain Toolkit integration for omnichain events and cross-chain messaging
 * Provides utilities for data normalization and consistent graph data structure
 */

import { getBalances } from "@zetachain/toolkit/client";
import { getForeignCoins } from "@zetachain/toolkit/client";
import { getCctxList } from "@zetachain/toolkit/client";
import { ZETACHAIN_CONFIG, APP_CONFIG } from "../config.js";

/**
 * @typedef {import('../../types/blockchain.js').GraphData} GraphData
 * @typedef {import('../../types/blockchain.js').GraphNode} GraphNode
 * @typedef {import('../../types/blockchain.js').GraphEdge} GraphEdge
 * @typedef {import('../../types/zetachain.js').OmnichainEvent} OmnichainEvent
 * @typedef {import('../../types/zetachain.js').CrossChainMessage} CrossChainMessage
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 */

/**
 * ZetaChain Toolkit error types
 * @enum {string}
 */
export const TOOLKIT_ERROR_TYPES = {
  INITIALIZATION_ERROR: "INITIALIZATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_PARAMS: "INVALID_PARAMS",
  DATA_PROCESSING_ERROR: "DATA_PROCESSING_ERROR",
  TOOLKIT_ERROR: "TOOLKIT_ERROR",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Custom ZetaChain Toolkit error class
 */
export class ZetaToolkitError extends Error {
  /**
   * @param {string} type - Error type from TOOLKIT_ERROR_TYPES
   * @param {string} message - Error message
   * @param {any} [originalError] - Original error object
   */
  constructor(type, message, originalError = null) {
    super(message);
    this.name = "ZetaToolkitError";
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * ZetaChain Toolkit service class
 */
export class ZetaChainToolkitService {
  /**
   * @param {'mainnet'|'testnet'} networkType - Network type
   */
  constructor(networkType = "testnet") {
    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.isInitialized = false;
    this.client = null;
    this.requestCache = new Map();

    this._initialize();
  }

  /**
   * Initialize ZetaChain Toolkit client
   * @private
   */
  async _initialize() {
    try {
      // The toolkit client is initialized per function call
      // Store network configuration for use in API calls
      this.rpcUrl = this.config.rpcUrl;
      this.chainId = this.config.chainId;
      this.cosmosApi = this.config.cosmosApi;
      this.isInitialized = true;
    } catch (error) {
      throw new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.INITIALIZATION_ERROR,
        `Failed to initialize ZetaChain Toolkit for ${this.networkType}`,
        error
      );
    }
  }

  /**
   * Switch network type
   * @param {'mainnet'|'testnet'} networkType - New network type
   */
  switchNetwork(networkType) {
    if (this.networkType === networkType) {
      return;
    }

    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.requestCache.clear(); // Clear cache when switching networks
    this._initialize();
  }

  /**
   * Execute toolkit operation with error handling and caching
   * @param {Function} operation - Async operation to execute
   * @param {string} [cacheKey] - Cache key for results
   * @returns {Promise<any>} Operation result
   * @private
   */
  async _executeWithErrorHandling(operation, cacheKey = null) {
    // Check cache first
    if (cacheKey && this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < APP_CONFIG.API.CACHE_DURATION) {
        return cached.data;
      }
      this.requestCache.delete(cacheKey);
    }

    try {
      const result = await operation();

      // Cache successful results
      if (cacheKey && result) {
        this.requestCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      throw this._mapError(error);
    }
  }

  /**
   * Map toolkit error to ZetaToolkitError
   * @param {Error} error - Original error
   * @returns {ZetaToolkitError} Mapped error
   * @private
   */
  _mapError(error) {
    if (error instanceof ZetaToolkitError) {
      return error;
    }

    const errorMessage = error.message?.toLowerCase() || "";

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("fetch")
    ) {
      return new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.NETWORK_ERROR,
        "Network error occurred while using ZetaChain Toolkit",
        error
      );
    }

    if (
      errorMessage.includes("invalid") ||
      errorMessage.includes("parameter") ||
      errorMessage.includes("bad request")
    ) {
      return new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.INVALID_PARAMS,
        "Invalid parameters provided to ZetaChain Toolkit",
        error
      );
    }

    if (
      errorMessage.includes("404") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("unavailable")
    ) {
      return new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.API_UNAVAILABLE,
        "ZetaChain Toolkit API is currently unavailable",
        error
      );
    }

    return new ZetaToolkitError(
      TOOLKIT_ERROR_TYPES.TOOLKIT_ERROR,
      error.message || "Unknown ZetaChain Toolkit error",
      error
    );
  }

  /**
   * Get omnichain events from ZetaChain with improved error handling
   * @param {Object} [options] - Query options
   * @param {string} [options.address] - Filter by address
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @param {number} [options.limit] - Maximum number of events
   * @returns {Promise<OmnichainEvent[]>} Array of omnichain events
   */
  async getOmnichainEvents(options = {}) {
    const { address, fromBlock = 0, toBlock = "latest", limit = 100 } = options;
    const cacheKey = `omni_events_${
      address || "all"
    }_${fromBlock}_${toBlock}_${limit}_${this.networkType}`;

    return this._executeWithErrorHandling(async () => {
      try {
        // Try multiple API endpoints since the toolkit might use different ones
        const apiEndpoints = [
          this.config.cosmosApi,
          this.config.explorerApiUrl,
          // Add backup endpoints if needed
        ];

        let cctxList = [];
        let lastError = null;

        // Try each endpoint until one works
        for (const api of apiEndpoints) {
          try {
            const response = await getCctxList({
              api,
              limit: Math.min(limit, 1000), // Cap limit to reasonable size
            });

            if (response && Array.isArray(response)) {
              cctxList = response;
              break;
            } else if (response && response.cctx) {
              cctxList = response.cctx;
              break;
            }
          } catch (error) {
            lastError = error;
            console.warn(`Failed to fetch from ${api}:`, error.message);
            continue;
          }
        }

        // If all endpoints failed, return empty array with warning
        if (cctxList.length === 0 && lastError) {
          console.warn(
            "All ZetaChain Toolkit API endpoints failed, returning empty array:",
            lastError.message
          );
          return [];
        }

        const events = [];

        for (const cctx of cctxList.slice(0, limit)) {
          // Filter by address if specified
          if (address) {
            const addressLower = address.toLowerCase();
            const sender = cctx.inbound_tx_sender?.toLowerCase() || "";
            const receiver = cctx.outbound_tx_receiver?.toLowerCase() || "";

            if (
              !sender.includes(addressLower) &&
              !receiver.includes(addressLower)
            ) {
              continue;
            }
          }

          // Filter by block range if specified
          const blockNumber = cctx.inbound_tx_observed_external_height || 0;
          if (fromBlock > 0 && blockNumber < fromBlock) continue;
          if (toBlock !== "latest" && blockNumber > toBlock) continue;

          // Transform CCTX to omnichain event
          const event = this._transformCCTXToEvent(cctx);
          if (event) {
            events.push(event);
          }
        }

        return events;
      } catch (error) {
        // Graceful fallback - return empty array but log the issue
        console.warn(
          "ZetaChain Toolkit getCctxList failed, returning empty array:",
          error.message
        );
        return [];
      }
    }, cacheKey);
  }

  /**
   * Transform CCTX data to OmnichainEvent format
   * @param {Object} cctx - Cross-chain transaction data from toolkit
   * @returns {OmnichainEvent|null} Transformed omnichain event
   * @private
   */
  _transformCCTXToEvent(cctx) {
    try {
      return {
        eventType: this._determineEventType(cctx),
        sourceChain: this._extractSourceChain(cctx),
        destinationChain: this._extractDestinationChain(cctx),
        txHash: cctx.inbound_tx_hash || cctx.index || `evt_${Date.now()}`,
        blockNumber: cctx.inbound_tx_observed_external_height || 0,
        timestamp: this._extractTimestamp(cctx),
        contractAddress: cctx.inbound_tx_sender || "",
        data: {
          amount: cctx.inbound_tx_amount || "0",
          token: cctx.inbound_tx_coin_type || "ZETA",
          recipient: cctx.outbound_tx_receiver || "",
          calldata: cctx.inbound_tx_message || "",
          gasLimit: cctx.outbound_tx_gas_limit || null,
          gasPrice: cctx.outbound_tx_gas_price || null,
          nonce: cctx.outbound_tx_tss_nonce || null,
        },
        status: this._mapCCTXStatus(cctx.cctx_status),
      };
    } catch (error) {
      console.warn("Failed to transform CCTX to event:", error);
      return null;
    }
  }

  /**
   * Extract source chain information from CCTX
   * @param {Object} cctx - CCTX data
   * @returns {number} Source chain ID
   * @private
   */
  _extractSourceChain(cctx) {
    return (
      cctx.inbound_tx_sender_chain_id ||
      cctx.source_chain_id ||
      cctx.inbound_tx_observed_external_height ||
      0
    );
  }

  /**
   * Extract destination chain information from CCTX
   * @param {Object} cctx - CCTX data
   * @returns {number} Destination chain ID
   * @private
   */
  _extractDestinationChain(cctx) {
    return (
      cctx.outbound_tx_receiver_chainid ||
      cctx.destination_chain_id ||
      cctx.outbound_tx_tss_nonce ||
      0
    );
  }

  /**
   * Extract timestamp from CCTX data
   * @param {Object} cctx - CCTX data
   * @returns {number} Unix timestamp
   * @private
   */
  _extractTimestamp(cctx) {
    if (cctx.created_at) {
      return new Date(cctx.created_at).getTime() / 1000;
    }

    if (cctx.inbound_tx_observed_at) {
      return new Date(cctx.inbound_tx_observed_at).getTime() / 1000;
    }

    return Date.now() / 1000;
  }

  /**
   * Determine event type from CCTX data
   * @param {Object} cctx - Cross-chain transaction data
   * @returns {'transfer'|'swap'|'contract_call'|'message'} Event type
   * @private
   */
  _determineEventType(cctx) {
    if (cctx.inbound_tx_message && cctx.inbound_tx_message.length > 0) {
      return "contract_call";
    }

    if (cctx.inbound_tx_coin_type && cctx.inbound_tx_coin_type !== "ZETA") {
      return "swap";
    }

    if (cctx.inbound_tx_amount && parseFloat(cctx.inbound_tx_amount) > 0) {
      return "transfer";
    }

    return "message";
  }

  /**
   * Get cross-chain messages with improved filtering
   * @param {Object} [options] - Query options
   * @param {string} [options.messageId] - Specific message ID
   * @param {number} [options.sourceChain] - Source chain ID
   * @param {number} [options.destinationChain] - Destination chain ID
   * @param {number} [options.limit] - Maximum number of messages
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<CrossChainMessage[]>} Array of cross-chain messages
   */
  async getCrossChainMessages(options = {}) {
    const {
      messageId,
      sourceChain,
      destinationChain,
      limit = 50,
      status,
    } = options;
    const cacheKey = `cc_messages_${messageId || "all"}_${
      sourceChain || "all"
    }_${destinationChain || "all"}_${limit}_${status || "all"}_${
      this.networkType
    }`;

    return this._executeWithErrorHandling(async () => {
      try {
        // Get CCTX list with retry logic
        let cctxList = [];
        const maxRetries = 2;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await getCctxList({
              api: this.config.cosmosApi,
              limit: Math.min(limit * 2, 1000), // Get more data for filtering
            });

            cctxList = Array.isArray(response)
              ? response
              : response?.cctx || [];
            break;
          } catch (error) {
            if (attempt === maxRetries) {
              console.warn(
                "Failed to get CCTX list after retries:",
                error.message
              );
              return [];
            }
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1))
            );
          }
        }

        const messages = [];

        for (const cctx of cctxList) {
          // Apply filters
          if (messageId && cctx.index !== messageId) continue;

          if (sourceChain && this._extractSourceChain(cctx) !== sourceChain)
            continue;

          if (
            destinationChain &&
            this._extractDestinationChain(cctx) !== destinationChain
          )
            continue;

          if (status) {
            const mappedStatus = this._mapCCTXStatus(cctx.cctx_status);
            if (mappedStatus !== status) continue;
          }

          const message = this._transformCCTXToMessage(cctx);
          if (message) {
            messages.push(message);
          }

          if (messages.length >= limit) break;
        }

        return messages;
      } catch (error) {
        console.warn(
          "ZetaChain Toolkit getCrossChainMessages failed, returning empty array:",
          error.message
        );
        return [];
      }
    }, cacheKey);
  }

  /**
   * Transform CCTX data to CrossChainMessage format
   * @param {Object} cctx - Cross-chain transaction data from toolkit
   * @returns {CrossChainMessage|null} Transformed cross-chain message
   * @private
   */
  _transformCCTXToMessage(cctx) {
    try {
      return {
        messageId:
          cctx.index ||
          `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sourceChain: this._extractSourceChain(cctx),
        destinationChain: this._extractDestinationChain(cctx),
        messageType: this._determineMessageType(cctx),
        payload: {
          amount: cctx.inbound_tx_amount || "0",
          token: cctx.inbound_tx_coin_type || "ZETA",
          sender: cctx.inbound_tx_sender || "",
          receiver: cctx.outbound_tx_receiver || "",
          data: cctx.inbound_tx_message || "",
        },
        status: this._mapCCTXStatus(cctx.cctx_status),
        timestamp: this._extractTimestamp(cctx),
        txHash: cctx.inbound_tx_hash || null,
        gasLimit: cctx.outbound_tx_gas_limit || null,
        gasPrice: cctx.outbound_tx_gas_price || null,
      };
    } catch (error) {
      console.warn("Failed to transform CCTX to message:", error);
      return null;
    }
  }

  /**
   * Determine message type from CCTX data
   * @param {Object} cctx - Cross-chain transaction data
   * @returns {'token_transfer'|'contract_call'|'data_message'} Message type
   * @private
   */
  _determineMessageType(cctx) {
    if (cctx.inbound_tx_message && cctx.inbound_tx_message.length > 0) {
      return "contract_call";
    }

    if (cctx.inbound_tx_amount && parseFloat(cctx.inbound_tx_amount) > 0) {
      return "token_transfer";
    }

    return "data_message";
  }

  /**
   * Map CCTX status to standard message status
   * @param {string} status - CCTX status
   * @returns {'sent'|'received'|'executed'|'failed'} Mapped status
   * @private
   */
  _mapCCTXStatus(status) {
    if (!status) return "sent";

    const normalizedStatus = status.toLowerCase();

    if (
      normalizedStatus.includes("success") ||
      normalizedStatus.includes("complete") ||
      normalizedStatus.includes("executed")
    ) {
      return "executed";
    }

    if (
      normalizedStatus.includes("fail") ||
      normalizedStatus.includes("error") ||
      normalizedStatus.includes("abort")
    ) {
      return "failed";
    }

    if (
      normalizedStatus.includes("received") ||
      normalizedStatus.includes("confirmed") ||
      normalizedStatus.includes("observed")
    ) {
      return "received";
    }

    return "sent";
  }

  /**
   * Get foreign coins (supported tokens) from ZetaChain
   * @returns {Promise<Array>} Array of foreign coin data
   */
  async getForeignCoins() {
    const cacheKey = `foreign_coins_${this.networkType}`;

    return this._executeWithErrorHandling(async () => {
      try {
        const response = await getForeignCoins({
          api: this.config.cosmosApi,
        });

        return response || [];
      } catch (error) {
        console.warn("Failed to get foreign coins:", error.message);
        return [];
      }
    }, cacheKey);
  }

  /**
   * Get address balances using ZetaChain toolkit
   * @param {string} address - Address to query
   * @returns {Promise<Array>} Array of balance data
   */
  async getAddressBalances(address) {
    if (!address) {
      throw new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.INVALID_PARAMS,
        "Address is required"
      );
    }

    const cacheKey = `balances_${address}_${this.networkType}`;

    return this._executeWithErrorHandling(async () => {
      try {
        const response = await getBalances({
          address,
          api: this.config.cosmosApi,
        });

        return response || [];
      } catch (error) {
        console.warn(`Failed to get balances for ${address}:`, error.message);
        return [];
      }
    }, cacheKey);
  }

  /**
   * Create normalized graph data structure from cross-chain transactions
   * @param {CrossChainTransaction[]} transactions - Array of cross-chain transactions
   * @param {Object} [options] - Normalization options
   * @param {boolean} [options.includeAddresses] - Include address nodes
   * @param {boolean} [options.includeContracts] - Include contract nodes
   * @param {number} [options.maxNodes] - Maximum number of nodes
   * @param {number} [options.maxEdges] - Maximum number of edges
   * @returns {GraphData} Normalized graph data
   */
  createGraphDataFromTransactions(transactions, options = {}) {
    const {
      includeAddresses = true,
      includeContracts = true,
      maxNodes = APP_CONFIG.GRAPH.MAX_NODES,
      maxEdges = APP_CONFIG.GRAPH.MAX_EDGES,
    } = options;

    try {
      const nodes = new Map();
      const edges = [];
      const chainNodes = new Set();
      const addressNodes = new Set();

      // Limit transactions to process
      const transactionsToProcess = transactions.slice(
        0,
        Math.floor(maxNodes / 3)
      );

      // Process each transaction
      for (const tx of transactionsToProcess) {
        if (nodes.size >= maxNodes) break;

        // Add chain nodes
        const sourceChainId = `chain_${tx.sourceChain?.chainId || "unknown"}`;
        const destChainId = `chain_${
          tx.destinationChain?.chainId || "unknown"
        }`;

        if (!chainNodes.has(sourceChainId) && tx.sourceChain) {
          nodes.set(sourceChainId, this._createChainNode(tx.sourceChain));
          chainNodes.add(sourceChainId);
        }

        if (
          !chainNodes.has(destChainId) &&
          tx.destinationChain &&
          destChainId !== sourceChainId
        ) {
          nodes.set(destChainId, this._createChainNode(tx.destinationChain));
          chainNodes.add(destChainId);
        }

        // Add address nodes if enabled
        if (includeAddresses) {
          if (tx.from && !addressNodes.has(tx.from) && nodes.size < maxNodes) {
            nodes.set(`addr_${tx.from}`, this._createAddressNode(tx.from));
            addressNodes.add(tx.from);
          }

          if (tx.to && !addressNodes.has(tx.to) && nodes.size < maxNodes) {
            nodes.set(`addr_${tx.to}`, this._createAddressNode(tx.to));
            addressNodes.add(tx.to);
          }
        }

        // Add contract nodes if enabled
        if (includeContracts && tx.omnichainContract && nodes.size < maxNodes) {
          const contractId = `contract_${tx.omnichainContract}`;
          if (!nodes.has(contractId)) {
            nodes.set(
              contractId,
              this._createContractNode(tx.omnichainContract, tx)
            );
          }
        }

        // Create edge for the transaction
        if (edges.length < maxEdges) {
          const edgeId = `edge_${tx.txHash || Date.now()}_${edges.length}`;
          edges.push(
            this._createTransactionEdge(edgeId, sourceChainId, destChainId, tx)
          );
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges: edges.slice(0, maxEdges),
      };
    } catch (error) {
      throw new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.DATA_PROCESSING_ERROR,
        "Failed to create graph data from transactions",
        error
      );
    }
  }

  /**
   * Create chain node for graph
   * @param {Object} chainInfo - Chain information
   * @returns {GraphNode} Chain node
   * @private
   */
  _createChainNode(chainInfo) {
    return {
      id: `chain_${chainInfo.chainId}`,
      type: "chain",
      label: chainInfo.name || `Chain ${chainInfo.chainId}`,
      data: chainInfo,
      style: {
        backgroundColor: this._getChainColor(chainInfo.chainId),
        borderColor: "#ffffff",
        borderWidth: 2,
        size: 60,
      },
    };
  }

  /**
   * Create address node for graph
   * @param {string} address - Address
   * @returns {GraphNode} Address node
   * @private
   */
  _createAddressNode(address) {
    return {
      id: `addr_${address}`,
      type: "address",
      label: `${address.slice(0, 8)}...${address.slice(-6)}`,
      data: {
        address,
        type: "wallet",
      },
      style: {
        backgroundColor: APP_CONFIG.COLORS.DARK.SURFACE_VARIANT,
        borderColor: APP_CONFIG.COLORS.DARK.PRIMARY,
        borderWidth: 1,
        size: 30,
      },
    };
  }

  /**
   * Create contract node for graph
   * @param {string} contractAddress - Contract address
   * @param {CrossChainTransaction} tx - Transaction context
   * @returns {GraphNode} Contract node
   * @private
   */
  _createContractNode(contractAddress, tx) {
    return {
      id: `contract_${contractAddress}`,
      type: "contract",
      label: `Contract ${contractAddress.slice(0, 8)}...`,
      data: {
        address: contractAddress,
        name: "Omnichain Contract",
        contractType: "omnichain",
        supportedChains: [
          tx.sourceChain?.chainId,
          tx.destinationChain?.chainId,
        ].filter(Boolean),
      },
      style: {
        backgroundColor: APP_CONFIG.COLORS.DARK.SECONDARY,
        borderColor: APP_CONFIG.COLORS.DARK.ACCENT,
        borderWidth: 2,
        size: 40,
      },
    };
  }

  /**
   * Create transaction edge for graph
   * @param {string} edgeId - Edge ID
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {CrossChainTransaction} tx - Transaction data
   * @returns {GraphEdge} Transaction edge
   * @private
   */
  _createTransactionEdge(edgeId, sourceId, targetId, tx) {
    return {
      id: edgeId,
      source: sourceId,
      target: targetId,
      data: {
        txHash: tx.txHash || "",
        blockNumber: tx.blockNumber || 0,
        timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
        from: tx.from || "",
        to: tx.to || "",
        value: tx.amount || "0",
        gasUsed: tx.gasUsed || "0",
        gasPrice: tx.gasPrice || "0",
        status: tx.status || "pending",
        chainId: tx.sourceChain?.chainId || 0,
        crossChainData: {
          sourceChain: tx.sourceChain,
          destinationChain: tx.destinationChain,
          bridgeContract: tx.omnichainContract || "",
          tokenInfo: tx.tokenInfo,
          crossChainTxHash: tx.txHash,
        },
      },
      style: {
        lineColor: this._getStatusColor(tx.status),
        lineWidth: 3,
        targetArrowColor: this._getStatusColor(tx.status),
        animation: tx.status === "pending" ? "pulse" : "none",
      },
    };
  }

  /**
   * Get color for chain based on chain ID
   * @param {number} chainId - Chain ID
   * @returns {string} Color hex code
   * @private
   */
  _getChainColor(chainId) {
    const colors = [
      "#1E90FF", // Ethereum blue
      "#F0B90B", // Binance yellow
      "#8247E5", // Polygon purple
      "#0052FF", // Base blue
      "#00D4AA", // ZetaChain teal
      "#FF6B35", // Arbitrum orange
      "#E84142", // Avalanche red
    ];

    return colors[chainId % colors.length] || APP_CONFIG.COLORS.DARK.PRIMARY;
  }

  /**
   * Get color for transaction status
   * @param {'pending'|'completed'|'failed'|'executed'|'sent'|'received'} status - Transaction status
   * @returns {string} Color hex code
   * @private
   */
  _getStatusColor(status) {
    switch (status) {
      case "completed":
      case "executed":
        return APP_CONFIG.COLORS.DARK.SUCCESS;
      case "failed":
        return APP_CONFIG.COLORS.DARK.ERROR;
      case "received":
        return APP_CONFIG.COLORS.DARK.ACCENT;
      case "pending":
      case "sent":
      default:
        return APP_CONFIG.COLORS.DARK.WARNING;
    }
  }

  /**
   * Clear request cache
   */
  clearCache() {
    this.requestCache.clear();
  }

  /**
   * Check if toolkit service is healthy
   * @returns {Promise<boolean>} Health status
   */
  async isHealthy() {
    try {
      // Try to get a small amount of data to test connectivity
      await this.getOmnichainEvents({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create and export singleton instances for both networks
 */
export const zetaToolkitMainnet = new ZetaChainToolkitService("mainnet");
export const zetaToolkitTestnet = new ZetaChainToolkitService("testnet");

/**
 * Get ZetaChain Toolkit service instance for network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {ZetaChainToolkitService} Toolkit service instance
 */
export function getZetaToolkitService(networkType) {
  return networkType === "mainnet" ? zetaToolkitMainnet : zetaToolkitTestnet;
}

/**
 * React Query key factory for ZetaChain Toolkit calls
 */
export const zetaToolkitQueryKeys = {
  all: ["zeta-toolkit"],
  omnichainEvents: (networkType, options) => [
    "zeta-toolkit",
    networkType,
    "omnichain-events",
    options,
  ],
  crossChainMessages: (networkType, options) => [
    "zeta-toolkit",
    networkType,
    "cc-messages",
    options,
  ],
  foreignCoins: (networkType) => ["zeta-toolkit", networkType, "foreign-coins"],
  addressBalances: (networkType, address) => [
    "zeta-toolkit",
    networkType,
    "balances",
    address,
  ],
};
