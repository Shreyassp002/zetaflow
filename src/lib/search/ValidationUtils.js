/**
 * @fileoverview Validation utilities for search functionality
 * Contains utility functions for validating transaction hashes and addresses
 */

/**
 * Check if a transaction hash looks valid
 * @param {string} txHash - Transaction hash to validate
 * @returns {boolean} Whether the hash looks valid
 */
export function isValidTxHash(txHash) {
  const cleanHash = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
  return /^[a-fA-F0-9]{64}$/.test(cleanHash);
}

/**
 * Check if an address looks valid
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address looks valid
 */
export function isValidAddress(address) {
  const cleanAddress = address.startsWith("0x") ? address.slice(2) : address;
  return /^[a-fA-F0-9]{40}$/.test(cleanAddress);
}

/**
 * Simulate API delay
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise} Promise that resolves after delay
 */
export function simulateDelay(min = 500, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}