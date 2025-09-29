/**
 * Network Statistics Service
 * Fetches real-time network data from ZetaChain RPC endpoints
 */

class NetworkStatsService {
  constructor() {
    this.endpoints = {
      mainnet: {
        rpc: "https://zetachain-evm.blockpi.network/v1/rpc/public",
        name: "ZetaChain Mainnet"
      },
      testnet: {
        rpc: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public", 
        name: "ZetaChain Athens Testnet"
      }
    };
    
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Get network statistics for the specified network
   * @param {'mainnet'|'testnet'} network 
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats(network = 'testnet') {
    const cacheKey = `stats_${network}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const endpoint = this.endpoints[network];
      if (!endpoint) {
        throw new Error(`Unknown network: ${network}`);
      }

      // Fetch multiple network metrics in parallel
      const [blockNumber, gasPrice, chainId] = await Promise.all([
        this.getBlockNumber(endpoint.rpc),
        this.getGasPrice(endpoint.rpc),
        this.getChainId(endpoint.rpc)
      ]);

      const stats = {
        blockHeight: blockNumber,
        gasPrice: gasPrice,
        tps: await this.calculateTPS(endpoint.rpc, blockNumber),
        chainId: chainId,
        networkName: endpoint.name,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error(`Failed to fetch network stats for ${network}:`, error);
      
      // Return fallback data on error
      return {
        blockHeight: 'Error',
        gasPrice: 'Error', 
        tps: 'Error',
        chainId: network === 'mainnet' ? 7000 : 7001,
        networkName: this.endpoints[network]?.name || 'Unknown',
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get current block number
   * @param {string} rpcUrl 
   * @returns {Promise<number>}
   */
  async getBlockNumber(rpcUrl) {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return parseInt(data.result, 16);
  }

  /**
   * Get current gas price
   * @param {string} rpcUrl 
   * @returns {Promise<string>}
   */
  async getGasPrice(rpcUrl) {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Convert from wei to gwei
    const gasPriceWei = parseInt(data.result, 16);
    const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
    
    return `${gasPriceGwei.toFixed(2)} Gwei`;
  }

  /**
   * Get chain ID
   * @param {string} rpcUrl 
   * @returns {Promise<number>}
   */
  async getChainId(rpcUrl) {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return parseInt(data.result, 16);
  }

  /**
   * Calculate approximate TPS by looking at recent blocks
   * @param {string} rpcUrl 
   * @param {number} currentBlock 
   * @returns {Promise<string>}
   */
  async calculateTPS(rpcUrl, currentBlock) {
    try {
      // Get last 10 blocks to calculate average TPS
      const blockPromises = [];
      for (let i = 0; i < 10; i++) {
        blockPromises.push(this.getBlock(rpcUrl, currentBlock - i));
      }

      const blocks = await Promise.all(blockPromises);
      
      // Calculate total transactions and time span
      let totalTransactions = 0;
      let oldestTimestamp = null;
      let newestTimestamp = null;

      blocks.forEach(block => {
        if (block && block.transactions) {
          totalTransactions += block.transactions.length;
          const timestamp = parseInt(block.timestamp, 16);
          
          if (!oldestTimestamp || timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
          }
          if (!newestTimestamp || timestamp > newestTimestamp) {
            newestTimestamp = timestamp;
          }
        }
      });

      if (oldestTimestamp && newestTimestamp && newestTimestamp > oldestTimestamp) {
        const timeSpan = newestTimestamp - oldestTimestamp;
        const tps = totalTransactions / timeSpan;
        return tps.toFixed(2);
      }

      return '0.00';
    } catch (error) {
      console.error('Failed to calculate TPS:', error);
      return 'N/A';
    }
  }

  /**
   * Get block data
   * @param {string} rpcUrl 
   * @param {number} blockNumber 
   * @returns {Promise<Object>}
   */
  async getBlock(rpcUrl, blockNumber) {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${blockNumber.toString(16)}`, false],
        id: 1
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  }

  /**
   * Clear cache for a specific network or all networks
   * @param {string} [network] - Optional network to clear, clears all if not specified
   */
  clearCache(network) {
    if (network) {
      this.cache.delete(`stats_${network}`);
    } else {
      this.cache.clear();
    }
  }
}

// Create singleton instance
const networkStatsService = new NetworkStatsService();

export default networkStatsService;
export { NetworkStatsService };