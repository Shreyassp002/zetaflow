#!/usr/bin/env node

/**
 * Simple focused test
 */

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";
import { getZetaChainExplorerAPIService } from "./src/lib/blockchain/zetascan-api.js";

async function testSimple() {
  const txHash =
    "0x41ef2c6d2ec0265e6feae6c753f4ca6b1904f7c837fdbe9863fd027b5a571f57";

  console.log(`🔍 Simple test: ${txHash}\n`);

  // Test 1: Just check if services initialize
  console.log("1. Service initialization:");
  try {
    const rpcService = getZetaRPCService("testnet");
    const apiService = getZetaChainExplorerAPIService("testnet");
    console.log("✅ Services initialized");

    // Test 2: Quick health check
    console.log("\n2. Quick health check:");
    const healthPromise = Promise.race([
      rpcService.getCurrentBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000)
      ),
    ]);

    const blockNumber = await healthPromise;
    console.log(`✅ Current block: ${blockNumber}`);

    // Test 3: Try different transaction approaches
    console.log("\n3. Transaction lookup approaches:");

    // Try API service first (might be faster)
    try {
      console.log("   Trying API service...");
      const apiTx = await Promise.race([
        apiService.getTransactionDetails(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API timeout")), 3000)
        ),
      ]);

      if (apiTx) {
        console.log("✅ API found transaction:");
        console.log(`   Status: ${apiTx.status}`);
        console.log(`   Amount: ${apiTx.amount}`);
      } else {
        console.log("❌ API: Not found or not cross-chain");
      }
    } catch (error) {
      console.log(`❌ API error: ${error.message}`);
    }

    // Try RPC with shorter timeout
    try {
      console.log("   Trying RPC service...");
      const rpcTx = await Promise.race([
        rpcService.getTransaction(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), 3000)
        ),
      ]);

      console.log("✅ RPC found transaction:");
      console.log(`   Block: ${rpcTx.blockNumber}`);
      console.log(`   From: ${rpcTx.from}`);
      console.log(`   To: ${rpcTx.to}`);
      console.log(`   Status: ${rpcTx.status}`);
    } catch (error) {
      console.log(`❌ RPC error: ${error.message}`);
    }
    console.log(`   Block: ${tx.blockNumber}`);
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Status: ${tx.status}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("\n🎯 Simple test completed!");
}

testSimple().catch(console.error);
