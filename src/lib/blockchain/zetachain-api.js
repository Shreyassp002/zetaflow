/**
 * @fileoverview ZetaChain Unified API - Complete implementation for transaction ID searching
 * Provides unified access to both EVM and cross-chain transactions on ZetaChain mainnet and testnet
 */

/**
 * ZetaChain API class for transaction ID searching
 * Optimized for fetching transaction data by hash from both mainnet and testnet networks
 */
export class ZetaChainAPI {
  constructor() {
    this.endpoints = {
      mainnet: {
        evm: "https://zetachain-evm.blockpi.network/v1/rpc/public",
        crosschain:
          "https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/",
      },
      testnet: {
        evm: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
        crosschain:
          "https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/",
      },
    };
  }

  /**
   * Get EVM transaction data (regular transactions)
   * @param {string} txHash - Transaction hash
   * @param {boolean} isMainnet - Whether to use mainnet (true) or testnet (false)
   * @returns {Promise<Object>} EVM transaction data
   */
  async getEVMTransaction(txHash, isMainnet = true) {
    const endpoint = isMainnet
      ? this.endpoints.mainnet.evm
      : this.endpoints.testnet.evm;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [txHash],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `EVM API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get EVM transaction receipt
   * @param {string} txHash - Transaction hash
   * @param {boolean} isMainnet - Whether to use mainnet (true) or testnet (false)
   * @returns {Promise<Object>} EVM transaction receipt data
   */
  async getEVMTransactionReceipt(txHash, isMainnet = true) {
    const endpoint = isMainnet
      ? this.endpoints.mainnet.evm
      : this.endpoints.testnet.evm;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `EVM Receipt API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get cross-chain transaction data
   * @param {string} txHash - Transaction hash
   * @param {boolean} isMainnet - Whether to use mainnet (true) or testnet (false)
   * @returns {Promise<Object>} Cross-chain transaction data
   */
  async getCrossChainTransaction(txHash, isMainnet = true) {
    const endpoint = isMainnet
      ? this.endpoints.mainnet.crosschain
      : this.endpoints.testnet.crosschain;

    const response = await fetch(endpoint + txHash);

    if (!response.ok) {
      throw new Error(
        `Cross-chain API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Auto-detect transaction type and network from ZetaScan URL
   * @param {string} zetascanUrl - ZetaScan URL
   * @returns {Object} Transaction detection info
   */
  detectTransactionType(zetascanUrl) {
    const isMainnet = !zetascanUrl.includes("testnet");
    const isCrossChain = zetascanUrl.includes("/cc/tx/");
    const txHash = zetascanUrl.split("/").pop();

    return {
      isMainnet,
      isCrossChain,
      txHash,
      network: isMainnet ? "mainnet" : "testnet",
      type: isCrossChain ? "cross-chain" : "evm",
    };
  }

  /**
   * Universal transaction getter - automatically detects type and fetches data
   * @param {string} zetascanUrl - ZetaScan URL
   * @returns {Promise<Object>} Transaction data
   */
  async getTransaction(zetascanUrl) {
    const { isMainnet, isCrossChain, txHash } =
      this.detectTransactionType(zetascanUrl);

    if (isCrossChain) {
      return this.getCrossChainTransaction(txHash, isMainnet);
    } else {
      return this.getEVMTransaction(txHash, isMainnet);
    }
  }
}

// Export singleton instance for application use
export const zetaChainAPI = new ZetaChainAPI();
