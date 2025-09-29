/**
 * GraphService - Handles graph data processing and Cytoscape.js integration
 */

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import fcose from 'cytoscape-fcose';

// Register layout algorithms
cytoscape.use(dagre);
cytoscape.use(coseBilkent);
cytoscape.use(fcose);

/**
 * Graph node types
 */
export const NODE_TYPES = {
  ADDRESS: 'address',
  CHAIN: 'chain',
  TRANSACTION: 'transaction'
};

/**
 * Graph edge types
 */
export const EDGE_TYPES = {
  TRANSACTION: 'transaction',
  CROSS_CHAIN: 'cross_chain'
};

/**
 * Default graph styles
 */
export const DEFAULT_STYLES = [
  {
    selector: 'node',
    style: {
      'background-color': '#6b7280',
      'border-width': 0,
      'label': 'data(label)',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -8,
      'font-size': '8px',
      'font-family': 'Geist Sans, sans-serif',
      'color': '#374151',
      'font-weight': '500',
      'width': 24,
      'height': 24
    }
  },
  {
    selector: 'node[type="address"]',
    style: {
      'background-color': '#4f46e5',
      'shape': 'ellipse',
      'width': 28,
      'height': 28,
      'text-margin-y': -10
    }
  },
  {
    selector: 'node[type="chain"]',
    style: {
      'background-color': '#0ea5e9',
      'shape': 'rectangle',
      'width': 32,
      'height': 20,
      'text-margin-y': -8,
      'font-size': '7px'
    }
  },
  {
    selector: 'node[type="transaction"]',
    style: {
      'background-color': '#10b981',
      'shape': 'diamond',
      'width': 20,
      'height': 20,
      'text-margin-y': -8,
      'font-size': '7px'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': '#000000',
      'border-width': 2,
      'border-style': 'solid'
    }
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 2,
      'border-color': '#ffffff',
      'border-style': 'solid',
      'z-index': 10
    }
  },
  {
    selector: 'node[type="address"].hover',
    style: {
      'background-color': '#3730a3',
      'border-width': 2,
      'border-color': '#ffffff'
    }
  },
  {
    selector: 'node[type="chain"].hover',
    style: {
      'background-color': '#0284c7',
      'border-width': 2,
      'border-color': '#ffffff'
    }
  },
  {
    selector: 'node[type="transaction"].hover',
    style: {
      'background-color': '#059669',
      'border-width': 2,
      'border-color': '#ffffff'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#6b7280',
      'target-arrow-color': '#6b7280',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2
    }
  },
  {
    selector: 'edge[type="cross_chain"]',
    style: {
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
      'line-style': 'dashed',
      'width': 3
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#000000',
      'target-arrow-color': '#000000',
      'width': 4
    }
  },
  {
    selector: 'edge:hover',
    style: {
      'line-color': '#374151',
      'target-arrow-color': '#374151',
      'width': 3,
      'z-index': 10
    }
  },
  {
    selector: 'edge.hover',
    style: {
      'line-color': '#1f2937',
      'target-arrow-color': '#1f2937',
      'width': 4,
      'z-index': 10,
      'transition-property': 'line-color, target-arrow-color, width',
      'transition-duration': '0.2s'
    }
  }
];

/**
 * Layout configurations
 */
export const LAYOUT_CONFIGS = {
  dagre: {
    name: 'dagre',
    rankDir: 'TB',
    spacingFactor: 1.5,
    nodeSep: 50,
    rankSep: 100,
    animate: true,
    animationDuration: 500
  },
  fcose: {
    name: 'fcose',
    quality: 'default',
    randomize: false,
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeSeparation: 75,
    idealEdgeLength: 100
  },
  coseBilkent: {
    name: 'cose-bilkent',
    quality: 'default',
    nodeRepulsion: 4500,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    animate: true,
    animationDuration: 1000
  }
};

class GraphService {
  constructor() {
    this.cy = null;
    this.currentLayout = 'fcose';
  }

  /**
   * Initialize Cytoscape instance
   * @param {HTMLElement} container - DOM element to render graph
   * @param {Object} options - Additional Cytoscape options
   * @returns {Object} Cytoscape instance
   */
  initialize(container, options = {}) {
    const defaultOptions = {
      container,
      style: DEFAULT_STYLES,
      layout: LAYOUT_CONFIGS[this.currentLayout],
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 3,
      ...options
    };

    this.cy = cytoscape(defaultOptions);
    this.setupEventHandlers();
    return this.cy;
  }

  /**
   * Set up default event handlers
   */
  setupEventHandlers() {
    if (!this.cy) return;

    // Add selection highlighting
    this.cy.on('select', 'node, edge', (event) => {
      const element = event.target;
      element.addClass('selected');
    });

    this.cy.on('unselect', 'node, edge', (event) => {
      const element = event.target;
      element.removeClass('selected');
    });
  }

  /**
   * Transform transaction data into graph elements
   * @param {Array} transactions - Array of transaction data
   * @returns {Object} Graph elements with nodes and edges
   */
  transformTransactionData(transactions) {
    const nodes = new Map();
    const edges = [];

    transactions.forEach((tx, index) => {
      // Create transaction node
      const txNodeId = `tx_${tx.txHash}`;
      nodes.set(txNodeId, {
        data: {
          id: txNodeId,
          label: `${tx.txHash.slice(0, 6)}...`,
          type: NODE_TYPES.TRANSACTION,
          txData: tx
        }
      });

      // Create address nodes
      if (tx.from) {
        const fromNodeId = `addr_${tx.from}`;
        if (!nodes.has(fromNodeId)) {
          nodes.set(fromNodeId, {
            data: {
              id: fromNodeId,
              label: `${tx.from.slice(0, 4)}...${tx.from.slice(-3)}`,
              type: NODE_TYPES.ADDRESS,
              address: tx.from
            }
          });
        }

        // Edge from address to transaction
        edges.push({
          data: {
            id: `edge_${fromNodeId}_${txNodeId}`,
            source: fromNodeId,
            target: txNodeId,
            type: EDGE_TYPES.TRANSACTION,
            txData: tx
          }
        });
      }

      if (tx.to) {
        const toNodeId = `addr_${tx.to}`;
        if (!nodes.has(toNodeId)) {
          nodes.set(toNodeId, {
            data: {
              id: toNodeId,
              label: `${tx.to.slice(0, 4)}...${tx.to.slice(-3)}`,
              type: NODE_TYPES.ADDRESS,
              address: tx.to
            }
          });
        }

        // Edge from transaction to address
        edges.push({
          data: {
            id: `edge_${txNodeId}_${toNodeId}`,
            source: txNodeId,
            target: toNodeId,
            type: EDGE_TYPES.TRANSACTION,
            txData: tx
          }
        });
      }

      // Handle cross-chain data
      if (tx.crossChainData) {
        const sourceChainId = `chain_${tx.crossChainData.sourceChain}`;
        const destChainId = `chain_${tx.crossChainData.destinationChain}`;

        // Create chain nodes
        if (!nodes.has(sourceChainId)) {
          nodes.set(sourceChainId, {
            data: {
              id: sourceChainId,
              label: `${tx.crossChainData.sourceChain}`,
              type: NODE_TYPES.CHAIN,
              chainId: tx.crossChainData.sourceChain
            }
          });
        }

        if (!nodes.has(destChainId)) {
          nodes.set(destChainId, {
            data: {
              id: destChainId,
              label: `${tx.crossChainData.destinationChain}`,
              type: NODE_TYPES.CHAIN,
              chainId: tx.crossChainData.destinationChain
            }
          });
        }

        // Cross-chain edge
        edges.push({
          data: {
            id: `edge_${sourceChainId}_${destChainId}`,
            source: sourceChainId,
            target: destChainId,
            type: EDGE_TYPES.CROSS_CHAIN,
            txData: tx
          }
        });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  }

  /**
   * Load data into the graph
   * @param {Array} transactions - Transaction data to visualize
   */
  loadData(transactions) {
    if (!this.cy) return;

    const elements = this.transformTransactionData(transactions);
    
    // Clear existing elements
    this.cy.elements().remove();
    
    // Add new elements
    this.cy.add([...elements.nodes, ...elements.edges]);
    
    // Apply layout
    this.applyLayout();
  }

  /**
   * Apply layout to the graph
   * @param {string} layoutName - Layout algorithm name
   */
  applyLayout(layoutName = this.currentLayout) {
    if (!this.cy) return;

    this.currentLayout = layoutName;
    const layout = this.cy.layout(LAYOUT_CONFIGS[layoutName]);
    layout.run();
  }

  /**
   * Add event listener to graph elements
   * @param {string} event - Event name
   * @param {string} selector - Element selector
   * @param {Function} handler - Event handler function
   */
  on(event, selector, handler) {
    if (!this.cy) return;
    this.cy.on(event, selector, handler);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {string} selector - Element selector
   * @param {Function} handler - Event handler function
   */
  off(event, selector, handler) {
    if (!this.cy) return;
    this.cy.off(event, selector, handler);
  }

  /**
   * Get selected elements
   * @returns {Object} Selected elements
   */
  getSelected() {
    if (!this.cy) return null;
    return this.cy.$(':selected');
  }

  /**
   * Fit graph to container
   */
  fit() {
    if (!this.cy) return;
    this.cy.fit();
  }

  /**
   * Center graph
   */
  center() {
    if (!this.cy) return;
    this.cy.center();
  }

  /**
   * Export graph as image
   * @param {Object} options - Export options
   * @returns {string} Base64 encoded image
   */
  exportPNG(options = {}) {
    if (!this.cy) return null;
    
    const defaultOptions = {
      output: 'base64uri',
      bg: '#ffffff',
      full: true,
      scale: 2,
      ...options
    };

    return this.cy.png(defaultOptions);
  }

  /**
   * Export graph data as JSON
   * @returns {Object} Graph data
   */
  exportJSON() {
    if (!this.cy) return null;
    return this.cy.json();
  }

  /**
   * Destroy the graph instance
   */
  destroy() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
}

export default GraphService;