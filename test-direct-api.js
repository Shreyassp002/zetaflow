#!/usr/bin/env node

/**
 * Direct API test to check endpoints
 */

import { ZETACHAIN_CONFIG } from "./src/lib/config.js";

async function testDirectAPI() {
  const txHash =
    "0x41ef2c6d2ec0265e6feae6c753f4ca6b1904f7c837fdbe9863fd027b5a571f57";

  console.log(`🔍 Testing direct API calls for: ${txHash}\n`);

  // Test testnet endpoints directly
  console.log("📡 TESTNET Endpoints:");
  console.log(`RPC: ${ZETACHAIN_CONFIG.testnet.rpcUrl}`);
  console.log(`API: ${ZETACHAIN_CONFIG.testnet.explorerApiUrl}`);
  console.log(`Explorer: ${ZETACHAIN_CONFIG.testnet.explorerUrl}`);

  // Test 1: Direct RPC call
  console.log("\n1. Direct RPC call:");
  try {
    const rpcResponse = await fetch(ZETACHAIN_CONFIG.testnet.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [txHash],
        id: 1,
      }),
    });

    const rpcData = await rpcResponse.json();
    console.log("✅ RPC Response:", JSON.stringify(rpcData, null, 2));
  } catch (error) {
    console.log(`❌ RPC Error: ${error.message}`);
  }

  // Test 2: Direct Blockscout API call
  console.log("\n2. Direct Blockscout API call:");
  try {
    const apiUrl = `${ZETACHAIN_CONFIG.testnet.explorerApiUrl}/transactions/${txHash}`;
    console.log(`Calling: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    console.log(`Status: ${apiResponse.status}`);

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log("✅ API Response:", JSON.stringify(apiData, null, 2));
    } else {
      const errorText = await apiResponse.text();
      console.log(`❌ API Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
  }

  // Test 3: Check if transaction exists in explorer web interface
  console.log("\n3. Explorer URL:");
  console.log(`${ZETACHAIN_CONFIG.testnet.explorerUrl}/tx/${txHash}`);

  // Test 4: Try alternative endpoints
  console.log("\n4. Testing alternative RPC methods:");
  const methods = ["eth_getTransactionReceipt", "eth_getBlockByNumber"];

  for (const method of methods) {
    try {
      let params;
      if (method === "eth_getTransactionReceipt") {
        params = [txHash];
      } else if (method === "eth_getBlockByNumber") {
        params = ["latest", false];
      }

      const response = await fetch(ZETACHAIN_CONFIG.testnet.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: method,
          params: params,
          id: 1,
        }),
      });

      const data = await response.json();
      console.log(`✅ ${method}:`, data.result ? "Found data" : "No data");

      if (method === "eth_getBlockByNumber" && data.result) {
        console.log(`   Latest block: ${parseInt(data.result.number, 16)}`);
      }
    } catch (error) {
      console.log(`❌ ${method}: ${error.message}`);
    }
  }

  console.log("\n🎯 Direct API test completed!");
}

testDirectAPI().catch(console.error);
