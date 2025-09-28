#!/usr/bin/env node

/**
 * Test ZetaScan API endpoints directly
 */

async function testZetaScanAPI() {
  console.log("🔍 Testing ZetaScan API endpoints...\n");

  const baseUrls = [
    "https://zetascan.com/api",
    "https://testnet.zetascan.com/api",
  ];

  for (const baseUrl of baseUrls) {
    console.log(`\n--- Testing ${baseUrl} ---`);

    // Test basic endpoints
    const endpoints = [
      "/v1/transactions",
      "/v1/blocks",
      "/v1/stats",
      "/health",
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await fetch(`${baseUrl}${endpoint}?limit=1`);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log(
            `✅ Success - Data keys: ${Object.keys(data).join(", ")}`
          );
        } else {
          console.log(`❌ Failed - ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
}

testZetaScanAPI().catch(console.error);
