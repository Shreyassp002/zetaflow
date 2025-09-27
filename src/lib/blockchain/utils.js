import { ethers } from "ethers";
import { getNetworkConfig } from "../config";

/**
 * Format blockchain address for display
 * @param {string} address - The blockchain address
 * @param {number} startChars - Number of characters to show at start
 * @param {number} endChars - Number of characters to show at end
 * @returns {string} Formatted address
 */
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Validate if a string is a valid Ethereum address
 * @param {string} address - The address to validate
 * @returns {boolean} True if valid address
 */
export const isValidAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Format wei amount to readable format
 * @param {string|number} wei - Amount in wei
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted amount
 */
export const formatWei = (wei, decimals = 4) => {
  try {
    const formatted = ethers.formatEther(wei);
    return parseFloat(formatted).toFixed(decimals);
  } catch {
    return "0";
  }
};

/**
 * Get network provider
 * @returns {ethers.JsonRpcProvider} Network provider
 */
export const getProvider = () => {
  const config = getNetworkConfig();
  return new ethers.JsonRpcProvider(config.rpcUrl);
};

/**
 * Format transaction hash for display
 * @param {string} hash - Transaction hash
 * @returns {string} Formatted hash
 */
export const formatTxHash = (hash) => {
  return formatAddress(hash, 8, 6);
};
