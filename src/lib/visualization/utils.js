// Export GraphService
export { default as GraphService } from './GraphService';
/**
 * Additional color utilities for graph visualization
 */
export const GRAPH_COLORS = {
  SUCCESS: '#10b981',
  PENDING: '#3b82f6', 
  FAILED: '#ef4444',
  NEUTRAL: '#6b7280',
  BACKGROUND: '#ffffff',
  BORDER: '#e5e7eb'
};

/**
 * Format address for display
 * @param {string} address - Full address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Formatted address
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format transaction hash for display
 * @param {string} hash - Transaction hash
 * @param {number} length - Number of characters to show
 * @returns {string} Formatted hash
 */
export function formatTxHash(hash, length = 8) {
  if (!hash || hash.length <= length) {
    return hash;
  }
  return `${hash.slice(0, length)}...`;
}

/**
 * Get status color based on transaction status
 * @param {string} status - Transaction status
 * @returns {string} Color hex code
 */
export function getStatusColor(status) {
  switch (status) {
    case 'success':
      return GRAPH_COLORS.SUCCESS;
    case 'pending':
      return GRAPH_COLORS.PENDING;
    case 'failed':
      return GRAPH_COLORS.FAILED;
    default:
      return GRAPH_COLORS.NEUTRAL;
  }
}