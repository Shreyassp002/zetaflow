"use client";

import { useState } from "react";
import { AppLayout, Header, Container } from "@/components/layout";
import {
  Button,
  ActionButton,
  StatusIndicator,
  StatusBadge,
} from "@/components/ui";
import { SearchContainer } from "@/components/search";

export default function Home() {
  const [networkMode, setNetworkMode] = useState("testnet");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    console.log("Network switched to:", network);
  };

  const handleSearchResult = (result) => {
    setSelectedTransaction(result);
    setShowVisualization(true);
    console.log("Search result selected:", result);
  };

  const handleResultSelect = (transaction) => {
    console.log("Transaction selected for visualization:", transaction);
    // This would trigger the graph visualization
  };

  return (
    <AppLayout>
      <Header networkMode={networkMode} onNetworkToggle={handleNetworkToggle} />

      <main className="flex-1 py-8">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-200px)]">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Network Stats
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Block Height:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gas Price:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TPS:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Visualization Controls
                </h2>
                <div className="space-y-3">
                  <ActionButton color="blue" className="w-full">
                    Start Visualization
                  </ActionButton>
                  <Button variant="outline" className="w-full">
                    Reset View
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Connection Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">ZetaChain RPC:</span>
                    <StatusIndicator status="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Explorer API:</span>
                    <StatusIndicator status="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Wallet:</span>
                    <StatusIndicator status="pending" />
                  </div>
                </div>
              </div>
            </div>

            {/* Visualization Area */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-lg h-full relative overflow-hidden">
                {!showVisualization ? (
                  /* Search Interface */
                  <div className="p-8 h-full flex flex-col">
                    <div className="text-center mb-8">
                      <h1 className="text-3xl font-bold text-black mb-2">
                        ZetaFlow Visualizer
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Explore ZetaChain cross-chain transactions and
                        connections
                      </p>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-full max-w-2xl">
                        <SearchContainer
                          networkType={networkMode}
                          onResultSelect={handleResultSelect}
                          onSearchComplete={handleSearchResult}
                        />
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-500 mt-8 space-y-2">
                      <p>
                        Enter a transaction hash or wallet address to start
                        visualizing cross-chain flows
                      </p>
                      <p>
                        <a
                          href="/search-demo"
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          View Search Demo →
                        </a>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Visualization Interface */
                  <div className="h-full relative">
                    {/* Visualization Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowVisualization(false)}
                          >
                            ← Back to Search
                          </Button>
                          <div className="text-sm text-gray-600">
                            {selectedTransaction && (
                              <span>
                                Visualizing:{" "}
                                {selectedTransaction.metadata?.totalResults ||
                                  0}{" "}
                                transaction(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Reset View
                          </Button>
                          <ActionButton color="blue" size="sm">
                            Export
                          </ActionButton>
                        </div>
                      </div>
                    </div>

                    {/* Cytoscape Container */}
                    <div
                      id="cy-container"
                      className="w-full h-full pt-16"
                      style={{ minHeight: "600px" }}
                    >
                      {/* Placeholder for now - will be replaced with actual Cytoscape integration */}
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-gray-600">
                            Loading visualization...
                          </p>
                          <div className="flex justify-center gap-2">
                            <StatusBadge status="success" text="Data Loaded" />
                            <StatusBadge
                              status="pending"
                              text="Rendering Graph"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <Container>
          <div className="py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>© 2024 ZetaFlow Visualizer. Built for ZetaChain ecosystem.</p>
              <div className="flex items-center space-x-4">
                <span>
                  Network: ZetaChain{" "}
                  {networkMode === "mainnet" ? "Mainnet" : "Testnet"}
                </span>
                <StatusIndicator status="success" size="sm" />
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </AppLayout>
  );
}
