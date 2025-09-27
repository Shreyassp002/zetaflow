import { ZETA_CONFIG } from "../config";

/**
 * Generate node data for cytoscape visualization
 * @param {Object} nodeInfo - Node information
 * @returns {Object} Cytoscape node data
 */
export const createNode = (nodeInfo) => {
  const {
    id,
    label,
    type = "default",
    size = ZETA_CONFIG.visualization.nodeSize.default,
  } = nodeInfo;

  return {
    data: {
      id,
      label,
      type,
      size,
    },
    classes: `node-${type}`,
    style: {
      width: size,
      height: size,
      "background-color": getNodeColor(type),
      label: label,
      "text-valign": "center",
      "text-halign": "center",
      color: ZETA_CONFIG.visualization.colors.text,
      "font-size": "12px",
    },
  };
};

/**
 * Generate edge data for cytoscape visualization
 * @param {Object} edgeInfo - Edge information
 * @returns {Object} Cytoscape edge data
 */
export const createEdge = (edgeInfo) => {
  const { id, source, target, type = "default", weight = 1 } = edgeInfo;

  return {
    data: {
      id,
      source,
      target,
      type,
      weight,
    },
    classes: `edge-${type}`,
    style: {
      width: Math.max(1, weight * 2),
      "line-color": getEdgeColor(type),
      "target-arrow-color": getEdgeColor(type),
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
    },
  };
};

/**
 * Get color for node type
 * @param {string} type - Node type
 * @returns {string} Color hex code
 */
export const getNodeColor = (type) => {
  const colors = {
    transaction: ZETA_CONFIG.visualization.colors.primary,
    block: ZETA_CONFIG.visualization.colors.secondary,
    contract: ZETA_CONFIG.visualization.colors.accent,
    address: "#9CA3AF",
    default: "#6B7280",
  };

  return colors[type] || colors.default;
};

/**
 * Get color for edge type
 * @param {string} type - Edge type
 * @returns {string} Color hex code
 */
export const getEdgeColor = (type) => {
  const colors = {
    transfer: ZETA_CONFIG.visualization.colors.primary,
    call: ZETA_CONFIG.visualization.colors.secondary,
    create: ZETA_CONFIG.visualization.colors.accent,
    default: "#4B5563",
  };

  return colors[type] || colors.default;
};

/**
 * Calculate layout positions for nodes
 * @param {Array} nodes - Array of nodes
 * @param {string} layoutType - Layout algorithm type
 * @returns {Object} Layout configuration
 */
export const getLayoutConfig = (nodes, layoutType = "cose") => {
  const layouts = {
    cose: {
      name: "cose",
      animate: true,
      animationDuration: ZETA_CONFIG.visualization.animationDuration,
      nodeRepulsion: 400000,
      nodeOverlap: 10,
      idealEdgeLength: 100,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },
    circle: {
      name: "circle",
      animate: true,
      animationDuration: ZETA_CONFIG.visualization.animationDuration,
      radius: Math.min(300, nodes.length * 20),
    },
    grid: {
      name: "grid",
      animate: true,
      animationDuration: ZETA_CONFIG.visualization.animationDuration,
      rows: Math.ceil(Math.sqrt(nodes.length)),
      cols: Math.ceil(Math.sqrt(nodes.length)),
    },
  };

  return layouts[layoutType] || layouts.cose;
};
