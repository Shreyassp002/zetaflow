/**
 * @fileoverview Type validation utilities
 * Provides runtime validation functions for the defined types
 */

import "./index.js"; // Import all type definitions

/**
 * Validates if an object matches the TransactionData structure
 * @param {any} obj - Object to validate
 * @returns {boolean} Whether the object is a valid TransactionData
 */
export function isValidTransactionData(obj) {
  return (
    obj &&
    typeof obj.txHash === "string" &&
    typeof obj.blockNumber === "number" &&
    typeof obj.timestamp === "number" &&
    typeof obj.from === "string" &&
    typeof obj.to === "string" &&
    typeof obj.value === "string" &&
    typeof obj.gasUsed === "string" &&
    typeof obj.gasPrice === "string" &&
    ["success", "pending", "failed"].includes(obj.status) &&
    typeof obj.chainId === "number"
  );
}

/**
 * Validates if an object matches the CrossChainTransaction structure
 * @param {any} obj - Object to validate
 * @returns {boolean} Whether the object is a valid CrossChainTransaction
 */
export function isValidCrossChainTransaction(obj) {
  return (
    obj &&
    typeof obj.txHash === "string" &&
    obj.sourceChain &&
    obj.destinationChain &&
    Array.isArray(obj.crossChainMessages) &&
    ["pending", "completed", "failed"].includes(obj.status) &&
    typeof obj.timestamp === "number"
  );
}

/**
 * Validates if an object matches the GraphData structure
 * @param {any} obj - Object to validate
 * @returns {boolean} Whether the object is a valid GraphData
 */
export function isValidGraphData(obj) {
  return obj && Array.isArray(obj.nodes) && Array.isArray(obj.edges);
}

/**
 * Validates network configuration
 * @param {any} config - Configuration to validate
 * @returns {boolean} Whether the configuration is valid
 */
export function isValidNetworkConfig(config) {
  return (
    config &&
    config.mainnet &&
    config.testnet &&
    typeof config.mainnet.rpcUrl === "string" &&
    typeof config.mainnet.chainId === "number" &&
    typeof config.testnet.rpcUrl === "string" &&
    typeof config.testnet.chainId === "number"
  );
}
