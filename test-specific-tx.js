#!/usr/bin/env node

/**
 * Test specific transaction hash to diagnose the issue
 */

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";
import { getZetaScanAPIService } from "./src/lib/blockchain/zetascan-api.js";

async function testSpecificTransaction() {
  const txHash =
    "0xaf83cb7ef241e2708d5900559e875b251b3432903f440e6bef177e0909ebe1b7";

  console.log(`🔍 Testing transaction: ${txHash}\n`);

  // Test on both networks
  for (const network of ["testnet", "mainnet"]) {
    console.log(`\n--- Testing on ${network.toUpperCase()} ---`);

    const rpcService = getZetaRPCService(network);
    const apiService = getZetaScanAPIService(network);

    // Test RPC service
    console.log("1. Testing RPC service...");
    try {
      const rpcResult = await rpcService.getTransaction(txHash);
      console.log("✅ RPC found transaction:", {
        hash: rpcResult.txHash,
        status: rpcResult.status,
        blockNumber: rpcResult.blockNumber,
      });
    } catch (error) {
      console.log("❌ RPC failed:", error.message);
    }

    // Test API service
    console.log("2. Testing API service...");
    try {
      const apiResult = await apiService.getTransactionDetails(txHash);
      if (apiResult) {
        console.log("✅ API found transaction:", {
          hash: apiResult.txHash,
          status: apiResult.status,
        });
      } else {
        console.log("❌ API returned null (transaction not found)");
      }
    } catch (error) {
      console.log("❌ API failed:", error.message);
    }

    // Test service health
    console.log("3. Testing service health...");
    try {
      const rpcHealthy = await rpcService.isHealthy();
      const apiHealthy = await apiService.isHealthy();
      console.log(`RPC healthy: ${rpcHealthy}, API healthy: ${apiHealthy}`);
    } catch (error) {
      console.log("❌ Health check failed:", error.message);
    }
  }
}

testSpecificTransaction().catch(console.error);
