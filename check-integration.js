#!/usr/bin/env node

/**
 * Quick integration check for ZetaFlow blockchain services
 * Tests RPC, API, and toolkit integration with real endpoints
 */

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";
import { getZetaChainExplorerAPIService } from "./src/lib/blockchain/zetascan-api.js";
import { ZETACHAIN_CONFIG } from "./src/lib/config.js";

async function checkIntegration() {
  console.log("🔧 Checking ZetaFlow Integration\n");

  // Test both networks
  const networks = ["testnet", "mainnet"];

  for (const network of networks) {
    console.log(`\n📡 Testing ${network.toUpperCase()} network:`);
    console.log(`RPC: ${ZETACHAIN_CONFIG[network].rpcUrl}`);
    console.log(`API: ${ZETACHAIN_CONFIG[network].explorerApiUrl}`);

    const rpcService = getZetaRPCService(network);
    const apiService = getZetaChainExplorerAPIService(network);

    // Test 1: RPC Health Check
    try {
      const blockNumber = await rpcService.getCurrentBlockNumber();
      console.log(`✅ RPC Health: Block ${blockNumber}`);
    } catch (error) {
      console.log(`❌ RPC Health: ${error.message}`);
    }

    // Test 2: API Health Check
    try {
      const isHealthy = await apiService.isHealthy();
      console.log(`✅ API Health: ${isHealthy ? "OK" : "Failed"}`);
    } catch (error) {
      console.log(`❌ API Health: ${error.message}`);
    }

    // Test 3: Network Info
    try {
      const networkInfo = await rpcService.getNetworkInfo();
      console.log(`✅ Network Info: Chain ID ${networkInfo.chainId}`);
    } catch (error) {
      console.log(`❌ Network Info: ${error.message}`);
    }

    // Test 4: Gas Price
    try {
      const gasPrice = await rpcService.getGasPrice();
      console.log(`✅ Gas Price: ${gasPrice} wei`);
    } catch (error) {
      console.log(`❌ Gas Price: ${error.message}`);
    }

    // Test 5: API Stats
    try {
      const stats = await apiService.getNetworkStats();
      console.log(`✅ Network Stats: ${stats.totalTransactions} transactions`);
    } catch (error) {
      console.log(`❌ Network Stats: ${error.message}`);
    }
  }

  console.log("\n🎯 Integration check completed!");
}

// Run the check
checkIntegration().catch((error) => {
  console.error("❌ Integration check failed:", error.message);
  process.exit(1);
});
