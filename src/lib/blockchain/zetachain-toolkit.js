/**
 * @fileoverview ZetaChain Toolkit integration for omnichain events and cross-chain messaging
 * Provides utilities for data normalization and consistent graph data structure
 */

import { getAddress } from "@zetachain/toolkit/client";
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
    this._initialize();
  }

  /**
   * Execute toolkit operation with error handling
   * @param {Function} operation - Async operation to execute
   * @returns {Promise<any>} Operation result
   * @private
   */
  async _executeWithErrorHandling(operation) {
    try {
      return await operation();
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
      errorMessage.includes("connection")
    ) {
      return new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.NETWORK_ERROR,
        "Network error occurred while using ZetaChain Toolkit",
        error
      );
    }

    if (
      errorMessage.includes("invalid") ||
      errorMessage.includes("parameter")
    ) {
      return new ZetaToolkitError(
        TOOLKIT_ERROR_TYPES.INVALID_PARAMS,
        "Invalid parameters provided to ZetaChain Toolkit",
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
   * Get omnichain events from ZetaChain
   * @param {Object} [options] - Query options
   * @param {string} [options.address] - Filter by address
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @param {number} [options.limit] - Maximum number of events
   * @returns {Promise<OmnichainEvent[]>} Array of omnichain events
   */
  async getOmnichainEvents(options = {}) {
    const { address, fromBlock = 0, toBlock = "latest", limit = 100 } = options;

    return this._executeWithErrorHandling(async () => {
      try {
        // Get cross-chain transactions using the toolkit
        const cctxList = await getCctxList({
          api: this.config.explorerApiUrl,
          limit,
        });

        const events = [];

        for (const cctx of cctxList.slice(0, limit)) {
          // Filter by address if specified
          if (
            address &&
            !cctx.inbound_tx_sender
              ?.toLowerCase()
              .includes(address.toLowerCase()) &&
            !cctx.outbound_tx_receiver
              ?.toLowerCase()
              .includes(address.toLowerCase())
          ) {
            continue;
          }

          // Transform CCTX to omnichain event
          const event = this._transformCCTXToEvent(cctx);
          if (event) {
            events.push(event);
          }
        }

        return events;
      } catch (error) {
        // Fallback to mock data structure if toolkit fails
        console.warn(
          "ZetaChain Toolkit getCctxList failed, returning empty array:",
          error.message
        );
        return [];
      }
    });
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
        sourceChain: cctx.inbound_tx_observed_external_height || 0,
        destinationChain: cctx.outbound_tx_tss_nonce || 0,
        txHash: cctx.inbound_tx_hash || cctx.index,
        blockNumber: cctx.inbound_tx_observed_external_height || 0,
        timestamp: cctx.created_at
          ? new Date(cctx.created_at).getTime() / 1000
          : Date.now() / 1000,
        contractAddress: cctx.inbound_tx_sender || "",
        data: {
          amount: cctx.inbound_tx_amount || "0",
          token: cctx.inbound_tx_coin_type || "ZETA",
          recipient: cctx.outbound_tx_receiver || "",
          calldata: cctx.inbound_tx_message || "",
        },
      };
    } catch (error) {
      console.warn("Failed to transform CCTX to event:", error);
      return null;
    }
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
   * Get cross-chain messages
   * @param {Object} [options] - Query options
   * @param {string} [options.messageId] - Specific message ID
   * @param {number} [options.sourceChain] - Source chain ID
   * @param {number} [options.destinationChain] - Destination chain ID
   * @param {number} [options.limit] - Maximum number of messages
   * @returns {Promise<CrossChainMessage[]>} Array of cross-chain messages
   */
  async getCrossChainMessages(options = {}) {
    const { messageId, sourceChain, destinationChain, limit = 50 } = options;

    return this._executeWithErrorHandling(async () => {
      try {
        // Get CCTX list and transform to messages
        const cctxList = await getCctxList({
          api: this.config.explorerApiUrl,
          limit,
        });

        const messages = [];

        for (const cctx of cctxList.slice(0, limit)) {
          // Filter by message ID if specified
          if (messageId && cctx.index !== messageId) {
            continue;
          }

          // Filter by chains if specified
          if (
            sourceChain &&
            cctx.inbound_tx_observed_external_height !== sourceChain
          ) {
            continue;
          }

          if (
            destinationChain &&
            cctx.outbound_tx_tss_nonce !== destinationChain
          ) {
            continue;
          }

          const message = this._transformCCTXToMessage(cctx);
          if (message) {
            messages.push(message);
          }
        }

        return messages;
      } catch (error) {
        console.warn(
          "ZetaChain Toolkit getCrossChainMessages failed, returning empty array:",
          error.message
        );
        return [];
      }
    });
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
        messageId: cctx.index || `msg_${Date.now()}`,
        sourceChain: cctx.inbound_tx_observed_external_height || 0,
        destinationChain: cctx.outbound_tx_tss_nonce || 0,
        messageType: this._determineMessageType(cctx),
        payload: {
          amount: cctx.inbound_tx_amount || "0",
          token: cctx.inbound_tx_coin_type || "ZETA",
          sender: cctx.inbound_tx_sender || "",
          receiver: cctx.outbound_tx_receiver || "",
          data: cctx.inbound_tx_message || "",
        },
        status: this._mapCCTXStatus(cctx.cctx_status),
        timestamp: cctx.created_at
          ? new Date(cctx.created_at).getTime() / 1000
          : Date.now() / 1000,
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
      normalizedStatus.includes("complete")
    ) {
      return "executed";
    }

    if (
      normalizedStatus.includes("fail") ||
      normalizedStatus.includes("error")
    ) {
      return "failed";
    }

    if (
      normalizedStatus.includes("received") ||
      normalizedStatus.includes("confirmed")
    ) {
      return "received";
    }

    return "sent";
  }

  /**
   * Create normalized graph data structure from cross-chain transactions
   * @param {CrossChainTransaction[]} transactions - Array of cross-chain transactions
   * @param {Object} [options] - Normalization options
   * @param {boolean} [options.includeAddresses] - Include address nodes
   * @param {boolean} [options.includeContracts] - Include contract nodes
   * @param {number} [options.maxNodes] - Maximum number of nodes
   * @returns {GraphData} Normalized graph data
   */
  createGraphDataFromTransactions(transactions, options = {}) {
    const {
      includeAddresses = true,
      includeContracts = true,
      maxNodes = APP_CONFIG.GRAPH.MAX_NODES,
    } = options;

    try {
      const nodes = new Map();
      const edges = [];
      const chainNodes = new Set();

      // Process each transaction
      for (const tx of transactions.slice(0, maxNodes / 2)) {
        // Add chain nodes
        const sourceChainId = `chain_${tx.sourceChain.chainId}`;
        const destChainId = `chain_${tx.destinationChain.chainId}`;

        if (!chainNodes.has(sourceChainId)) {
          nodes.set(sourceChainId, this._createChainNode(tx.sourceChain));
          chainNodes.add(sourceChainId);
        }

        if (!chainNodes.has(destChainId)) {
          nodes.set(destChainId, this._createChainNode(tx.destinationChain));
          chainNodes.add(destChainId);
        }

        // Add contract nodes if enabled
        if (includeContracts && tx.omnichainContract) {
          const contractId = `contract_${tx.omnichainContract}`;
          if (!nodes.has(contractId)) {
            nodes.set(
              contractId,
              this._createContractNode(tx.omnichainContract, tx)
            );
          }
        }

        // Create edge for the transaction
        const edgeId = `edge_${tx.txHash}`;
        edges.push(
          this._createTransactionEdge(edgeId, sourceChainId, destChainId, tx)
        );

        // Stop if we've reached max nodes
        if (nodes.size >= maxNodes) {
          break;
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges: edges.slice(0, APP_CONFIG.GRAPH.MAX_EDGES),
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
      label: chainInfo.name,
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
        supportedChains: [tx.sourceChain.chainId, tx.destinationChain.chainId],
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
        txHash: tx.txHash,
        blockNumber: 0,
        timestamp: tx.timestamp,
        from: "",
        to: "",
        value: tx.amount,
        gasUsed: "0",
        gasPrice: "0",
        status: tx.status,
        chainId: tx.sourceChain.chainId,
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
    ];

    return colors[chainId % colors.length] || APP_CONFIG.COLORS.DARK.PRIMARY;
  }

  /**
   * Get color for transaction status
   * @param {'pending'|'completed'|'failed'} status - Transaction status
   * @returns {string} Color hex code
   * @private
   */
  _getStatusColor(status) {
    switch (status) {
      case "completed":
        return APP_CONFIG.COLORS.DARK.SUCCESS;
      case "failed":
        return APP_CONFIG.COLORS.DARK.ERROR;
      case "pending":
      default:
        return APP_CONFIG.COLORS.DARK.WARNING;
    }
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
