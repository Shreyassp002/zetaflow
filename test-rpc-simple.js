#!/usr/bin/env node

/**
 * Simple RPC test
 */

import { ethers } from "ethers";

async function testRPC() {
  console.log("🔍 Testing RPC connection...\n");

  const rpcUrls = [
    "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
    "https://zetachain-evm.blockpi.network/v1/rpc/public",
  ];

  for (const rpcUrl of rpcUrls) {
    console.log(`Testing ${rpcUrl}...`);

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Test with timeout
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);

      console.log(`✅ Connected - Block number: ${blockNumber}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

testRPC().catch(console.error);
