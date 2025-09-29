"use client";

import { useState, useCallback } from "react";
import { AppLayout, Header } from "@/components/layout";
import {
  Button,
  ActionButton,
  StatusIndicator,
} from "@/components/ui";
import { SearchInput } from "@/components/search";
import NetworkStats from "@/components/sidebar/NetworkStats";

import { GraphVisualization, GraphControls } from "@/components/visualization";
import { getSearchService } from "@/lib/search/SearchService";

export default function Home() {
  const [networkMode, setNetworkMode] = useState("testnet");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);

  const [sidebarTransaction, setSidebarTransaction] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [graphTransactions, setGraphTransactions] = useState([]);
  const [graphLayout, setGraphLayout] = useState('fcose');
  const [graphService, setGraphService] = useState(null);

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    // Clear sidebar and visualization when switching networks
    setSidebarTransaction(null);
    setShowVisualization(false);
    setSelectedTransaction(null);
    setGraphTransactions([]);
    console.log("Network switched to:", network);
  };

  const handleSearchResult = (result) => {
    setSelectedTransaction(result);
    setShowVisualization(true);
    console.log("Search result selected:", result);
  };

  const handleResultSelect = (transaction) => {
    console.log("Transaction selected for visualization:", transaction);
    // Show transaction details in sidebar
    setSidebarTransaction(transaction);
    // This would also trigger the graph visualization
  };

  const handleNodeClick = useCallback((nodeData) => {
    console.log("Node clicked:", nodeData);

    // If it's a transaction node, show transaction details
    if (nodeData.type === 'transaction' && nodeData.txData) {
      setSidebarTransaction(nodeData.txData);
    }
    // If it's an address node, could show address details
    else if (nodeData.type === 'address') {
      // Could implement address details view
      console.log("Address node clicked:", nodeData.address);
    }
  }, []);

  const handleEdgeClick = useCallback((edgeData) => {
    console.log("Edge clicked:", edgeData);

    // Show transaction details for the edge
    if (edgeData.txData) {
      setSidebarTransaction(edgeData.txData);
    }
  }, []);

  const handleGraphExport = async (format) => {
    console.log("Exporting graph as:", format);

    if (!graphService) {
      alert('Graph service not available');
      return;
    }

    try {
      if (format === 'png') {
        const exportData = graphService.exportPNG();
        if (exportData) {
          // Create download link
          const link = document.createElement('a');
          link.download = `zetaflow-graph-${Date.now()}.png`;
          link.href = exportData;
          link.click();
        }
      } else if (format === 'json') {
        const exportData = graphService.exportJSON();
        if (exportData) {
          // Create download link for JSON
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `zetaflow-graph-${Date.now()}.json`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleGraphServiceReady = useCallback((service) => {
    setGraphService(service);
  }, []);

  const handleSearch = async (query, type) => {
    console.log("Search initiated:", { query, type, networkMode });

    setIsSearching(true);

    try {
      // Get the appropriate search service for the current network
      const searchService = getSearchService(networkMode);

      // Perform the search
      const searchResult = await searchService.search(query);
      console.log("Search result:", searchResult);

      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const transactionData = searchResult.data[0];

        // Show visualization
        setShowVisualization(true);
        setSelectedTransaction(searchResult);

        // Set graph transactions for visualization
        setGraphTransactions(searchResult.data);

        // Show transaction details in sidebar
        setSidebarTransaction(transactionData);

        console.log("Transaction data for sidebar:", transactionData);
      } else {
        console.log("No transaction data found");
        // Handle case where no results are found
        alert("No transaction found for the given query");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AppLayout>
      <Header networkMode={networkMode} onNetworkToggle={handleNetworkToggle} />

      <main className="flex-1 py-8">
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)] h-full px-12">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 xl:w-80 flex-shrink-0 space-y-4">
            <NetworkStats networkMode={networkMode} />

            <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-black">
                Visualization Controls
              </h2>
              <div className="space-y-3">
                <ActionButton
                  color="blue"
                  className="w-full"
                  onClick={() => setShowVisualization(!showVisualization)}
                  disabled={!graphTransactions.length}
                >
                  {showVisualization ? 'Hide Graph' : 'Show Graph'}
                </ActionButton>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!showVisualization}
                  onClick={() => {
                    if (graphService) {
                      graphService.fit();
                    }
                  }}
                >
                  Reset View
                </Button>
                <div className="text-xs text-gray-500 mt-2">
                  {graphTransactions.length > 0
                    ? `${graphTransactions.length} transaction(s) loaded`
                    : 'Search for transactions to visualize'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col space-y-6">
            {/* Search Input at Top */}
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <SearchInput
                  placeholder={`Search ${networkMode} transactions and addresses...`}
                  onSearch={handleSearch}
                  isLoading={isSearching}
                />
              </div>
            </div>

            {/* Graph Area */}
            <div className="flex-1 bg-white border-2 border-gray-300 rounded-lg min-h-[600px] relative overflow-hidden shadow-sm">
              {!showVisualization ? (
                /* Graph Placeholder */
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 border border-gray-300 rounded"></div>
                    </div>
                    <p className="text-lg font-medium">Graph Visualization</p>
                    <p className="text-sm mt-1">
                      Search for transactions to visualize cross-chain flows
                    </p>
                  </div>
                </div>
              ) : (
                /* Visualization Interface */
                <div className="h-full relative">
                  {/* Visualization Header */}
                  <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b-2 border-gray-300 p-4">
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
                      <div className="flex items-center">
                        <GraphControls
                          currentLayout={graphLayout}
                          onLayoutChange={setGraphLayout}
                          onExport={handleGraphExport}
                          graphService={graphService}
                          disabled={!graphTransactions.length}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Graph Visualization */}
                  <div className="w-full h-full pt-16">
                    <GraphVisualization
                      transactions={graphTransactions}
                      onNodeClick={handleNodeClick}
                      onEdgeClick={handleEdgeClick}
                      onGraphServiceReady={handleGraphServiceReady}
                      layout={graphLayout}
                      className="h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Transaction Details */}
          <div className="w-full lg:w-64 xl:w-80 flex-shrink-0 space-y-4">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4 h-full shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-black">
                Transaction Details
              </h2>
              {sidebarTransaction ? (
                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {/* Transaction Hash */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      Transaction Hash
                    </label>
                    <span className="text-sm font-mono text-black break-all">
                      {sidebarTransaction.txHash ?
                        `${sidebarTransaction.txHash.slice(0, 10)}...${sidebarTransaction.txHash.slice(-8)}`
                        : "N/A"}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      Status
                    </label>
                    <span className={`text-sm font-medium capitalize ${sidebarTransaction.status === 'success' ? 'text-green-600' :
                      sidebarTransaction.status === 'pending' ? 'text-yellow-600' :
                        sidebarTransaction.status === 'failed' ? 'text-red-600' :
                          'text-gray-600'
                      }`}>
                      {sidebarTransaction.status || "Unknown"}
                    </span>
                  </div>

                  {/* From Address */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      From
                    </label>
                    <span className="text-sm font-mono text-black">
                      {sidebarTransaction.from ?
                        `${sidebarTransaction.from.slice(0, 6)}...${sidebarTransaction.from.slice(-4)}`
                        : "N/A"}
                    </span>
                  </div>

                  {/* To Address */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      To
                    </label>
                    <span className="text-sm font-mono text-black">
                      {sidebarTransaction.to ?
                        `${sidebarTransaction.to.slice(0, 6)}...${sidebarTransaction.to.slice(-4)}`
                        : "N/A"}
                    </span>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      Amount
                    </label>
                    <span className="text-sm text-black">
                      {sidebarTransaction.value ?
                        `${(parseFloat(sidebarTransaction.value) / Math.pow(10, 18)).toFixed(6)} ZETA`
                        : "0 ZETA"}
                    </span>
                  </div>

                  {/* Block Number */}
                  {sidebarTransaction.blockNumber && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Block
                      </label>
                      <span className="text-sm text-black">
                        {sidebarTransaction.blockNumber}
                      </span>
                    </div>
                  )}

                  {/* Chain Info */}
                  {sidebarTransaction.chainId && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Chain
                      </label>
                      <span className="text-sm text-black">
                        {sidebarTransaction.chainName || `Chain ${sidebarTransaction.chainId}`}
                      </span>
                    </div>
                  )}

                  {/* Cross-chain Data */}
                  {sidebarTransaction.crossChainData && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                          Source Chain
                        </label>
                        <span className="text-sm text-black">
                          {sidebarTransaction.crossChainData.sourceChain || "Unknown"}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                          Destination Chain
                        </label>
                        <span className="text-sm text-black">
                          {sidebarTransaction.crossChainData.destinationChain || "Unknown"}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Timestamp */}
                  {sidebarTransaction.timestamp && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Time
                      </label>
                      <span className="text-sm text-black">
                        {typeof sidebarTransaction.timestamp === 'number'
                          ? new Date(sidebarTransaction.timestamp > 1000000000000 ? sidebarTransaction.timestamp : sidebarTransaction.timestamp * 1000).toLocaleString()
                          : sidebarTransaction.timestamp}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  <div className="w-12 h-12 mx-auto mb-3 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 border border-gray-300 rounded"></div>
                  </div>
                  <p className="text-sm">No transaction selected</p>
                  <p className="text-xs mt-1">
                    Click on graph nodes or edges to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-300 bg-white mt-8">
        <div className="py-4 px-12">
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
      </footer>


    </AppLayout>
  );
}