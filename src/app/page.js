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
import TransactionSidebar from "@/components/sidebar/TransactionSidebar";
import { useToast } from "@/components/providers";

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
  
  // Toast notifications
  const { showError, showWarning, showSuccess, showInfo } = useToast();

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    // Clear sidebar and visualization when switching networks
    setSidebarTransaction(null);
    setShowVisualization(false);
    setSelectedTransaction(null);
    setGraphTransactions([]);
    console.log("Network switched to:", network);
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
      showError('Graph service not available. Please wait for the graph to load completely.', {
        title: "Export Error",
        duration: 4000
      });
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
          
          showSuccess('Graph exported as PNG successfully!', {
            title: "Export Complete",
            duration: 3000
          });
        } else {
          showError('Failed to generate PNG export. Please try again.', {
            title: "Export Error",
            duration: 4000
          });
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
          
          showSuccess('Graph data exported as JSON successfully!', {
            title: "Export Complete",
            duration: 3000
          });
        } else {
          showError('Failed to generate JSON export. Please try again.', {
            title: "Export Error",
            duration: 4000
          });
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      showError(`Export failed: ${error.message}. Please try again.`, {
        title: "Export Error",
        duration: 5000
      });
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

      // Create notification handler for the search service
      const notificationHandler = {
        showError,
        showWarning,
        showInfo,
        showSuccess,
        onNetworkSwitch: (targetNetwork) => {
          handleNetworkToggle(targetNetwork);
        }
      };

      // Perform the search with notification support
      const searchResult = await searchService.search(query, {
        notificationHandler
      });
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
        
        // Show success notification
        showSuccess(`Found transaction on ${networkMode} network`, {
          title: "Search Successful",
          duration: 3000
        });
      } else {
        console.log("No transaction data found");
        // Handle case where no results are found
        showWarning("No transaction found for the given query", {
          title: "No Results",
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
      
      // The SearchService now handles all error notifications internally
      // This catch block is mainly for unexpected errors that bypass the service
      if (!error.type) {
        showError(`Unexpected error: ${error.message}`, {
          title: "Search Error",
          duration: 5000
        });
      }
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
            <TransactionSidebar transaction={sidebarTransaction} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-300 bg-white mt-8">
        <div className="py-4 px-12">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Built for ZetaChain ecosystem.</p>
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