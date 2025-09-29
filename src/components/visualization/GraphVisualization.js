'use client';

import { useEffect, useRef, useState } from 'react';
import { GraphService } from '../../lib/visualization/utils';

/**
 * GraphVisualization Component
 * Renders interactive transaction graph using Cytoscape.js
 */
export default function GraphVisualization({
  transactions = [],
  onNodeClick,
  onEdgeClick,
  className = '',
  layout = 'fcose',
  onGraphServiceReady
}) {
  const containerRef = useRef(null);
  const graphServiceRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tooltip functions
  const showTooltip = (event, content, isHTML = false) => {
    if (!tooltipRef.current) return;
    
    if (isHTML) {
      tooltipRef.current.innerHTML = content;
    } else {
      tooltipRef.current.textContent = content;
    }
    
    tooltipRef.current.style.display = 'block';
    
    // Position tooltip closer to the node
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    tooltipRef.current.style.left = `${x + 15}px`;
    tooltipRef.current.style.top = `${y - 10}px`;
  };

  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.display = 'none';
  };

  // Initialize graph service (only once)
  useEffect(() => {
    if (!containerRef.current || graphServiceRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create new graph service instance
      graphServiceRef.current = new GraphService();
      
      // Initialize Cytoscape with container
      const cy = graphServiceRef.current.initialize(containerRef.current, {
        layout: { name: layout }
      });

      // Add hover effects
      graphServiceRef.current.on('mouseover', 'node', (event) => {
        const node = event.target;
        node.addClass('hover');
        
        // Show detailed tooltip
        const nodeData = node.data();
        let tooltipContent = '';
        
        if (nodeData.type === 'address') {
          tooltipContent = `
            <div class="font-semibold text-xs mb-1">Address</div>
            <div class="text-xs font-mono">${nodeData.address}</div>
          `;
        } else if (nodeData.type === 'transaction') {
          const txData = nodeData.txData;
          tooltipContent = `
            <div class="font-semibold text-xs mb-1">Transaction</div>
            <div class="text-xs font-mono mb-1">${txData?.txHash || 'N/A'}</div>
            ${txData?.amount ? `<div class="text-xs">Amount: ${txData.amount}</div>` : ''}
            ${txData?.status ? `<div class="text-xs">Status: ${txData.status}</div>` : ''}
          `;
        } else if (nodeData.type === 'chain') {
          tooltipContent = `
            <div class="font-semibold text-xs mb-1">Chain</div>
            <div class="text-xs">ID: ${nodeData.chainId}</div>
          `;
        }
        
        // Create or update tooltip
        showTooltip(event.originalEvent, tooltipContent, true);
      });

      graphServiceRef.current.on('mouseout', 'node', (event) => {
        const node = event.target;
        node.removeClass('hover');
        hideTooltip();
      });

      graphServiceRef.current.on('mouseover', 'edge', (event) => {
        const edge = event.target;
        edge.addClass('hover');
        
        // Show edge tooltip
        const edgeData = edge.data();
        let tooltipContent = '';
        
        if (edgeData.txData) {
          const txData = edgeData.txData;
          tooltipContent = `
            <div class="font-semibold text-xs mb-1">Transaction Flow</div>
            <div class="text-xs font-mono mb-1">${txData.txHash?.slice(0, 16)}...</div>
            ${txData.amount ? `<div class="text-xs">Amount: ${txData.amount}</div>` : ''}
            ${edgeData.type === 'cross_chain' ? '<div class="text-xs text-blue-300">Cross-chain</div>' : ''}
          `;
        } else {
          tooltipContent = '<div class="text-xs">Transaction Flow</div>';
        }
        
        showTooltip(event.originalEvent, tooltipContent, true);
      });

      graphServiceRef.current.on('mouseout', 'edge', (event) => {
        const edge = event.target;
        edge.removeClass('hover');
        hideTooltip();
      });

      // Add double-click to fit
      graphServiceRef.current.on('dblclick', (event) => {
        if (event.target === cy) {
          cy.fit();
        }
      });

      // Add keyboard shortcuts
      const handleKeyDown = (event) => {
        if (!cy) return;
        
        switch (event.key) {
          case 'f':
          case 'F':
            if (!event.ctrlKey && !event.metaKey) {
              cy.fit();
              event.preventDefault();
            }
            break;
          case 'c':
          case 'C':
            if (!event.ctrlKey && !event.metaKey) {
              cy.center();
              event.preventDefault();
            }
            break;
          case 'r':
          case 'R':
            if (!event.ctrlKey && !event.metaKey) {
              cy.zoom(1);
              cy.center();
              event.preventDefault();
            }
            break;
          case 'Escape':
            cy.$(':selected').unselect();
            event.preventDefault();
            break;
        }
      };

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);

      // Store cleanup function for keyboard events
      cy._keydownHandler = handleKeyDown;

      setIsLoading(false);
      
      // Notify parent component that graph service is ready
      if (onGraphServiceReady) {
        onGraphServiceReady(graphServiceRef.current);
      }
    } catch (err) {
      console.error('Failed to initialize graph:', err);
      setError('Failed to initialize graph visualization');
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (graphServiceRef.current && graphServiceRef.current.cy) {
        // Remove keyboard event listener
        if (graphServiceRef.current.cy._keydownHandler) {
          document.removeEventListener('keydown', graphServiceRef.current.cy._keydownHandler);
        }
        graphServiceRef.current.destroy();
        graphServiceRef.current = null;
      }
      hideTooltip();
    };
  }, []); // Only run once on mount

  // Set up click event handlers when they change
  useEffect(() => {
    if (!graphServiceRef.current) return;

    // Remove existing handlers
    graphServiceRef.current.off('tap', 'node');
    graphServiceRef.current.off('tap', 'edge');

    // Add new handlers
    if (onNodeClick) {
      graphServiceRef.current.on('tap', 'node', (event) => {
        const node = event.target;
        onNodeClick(node.data());
      });
    }

    if (onEdgeClick) {
      graphServiceRef.current.on('tap', 'edge', (event) => {
        const edge = event.target;
        onEdgeClick(edge.data());
      });
    }
  }, [onNodeClick, onEdgeClick]);

  // Load transaction data when it changes
  useEffect(() => {
    if (!graphServiceRef.current || !transactions.length) return;

    try {
      setIsLoading(true);
      setError(null);
      
      graphServiceRef.current.loadData(transactions);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load transaction data:', err);
      setError('Failed to load transaction data');
      setIsLoading(false);
    }
  }, [transactions]);

  // Handle layout changes
  useEffect(() => {
    if (!graphServiceRef.current) return;

    try {
      graphServiceRef.current.applyLayout(layout);
    } catch (err) {
      console.error('Failed to apply layout:', err);
    }
  }, [layout]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Visualization Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading graph...</p>
          </div>
        </div>
      )}

      {/* Graph container */}
      <div 
        ref={containerRef}
        className="w-full h-full min-h-[400px]"
        style={{ background: '#ffffff' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-20 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none max-w-xs border border-gray-700"
        style={{ display: 'none' }}
      />

      {/* Graph instructions overlay */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 border border-gray-200 rounded p-3 text-xs text-gray-600 max-w-xs">
          <div className="font-medium mb-2">Graph Controls:</div>
          <div className="space-y-1">
            <div>• Click nodes/edges to view details</div>
            <div>• Hover for quick info</div>
            <div>• Double-click background to fit view</div>
            <div>• Scroll to zoom, drag to pan</div>
            <div>• Press F to fit, C to center, R to reset</div>
            <div>• Press Escape to clear selection</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && !transactions.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Data to Visualize</h3>
            <p className="text-gray-600">Search for transactions to see the graph visualization</p>
          </div>
        </div>
      )}
    </div>
  );
}