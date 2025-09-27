/**
 * @fileoverview Core blockchain data type definitions for ZetaFlow
 * Defines JSDoc types for transactions, cross-chain data, and graph structures
 */

/**
 * Transaction data structure
 * @typedef {Object} TransactionData
 * @property {string} txHash - Transaction hash
 * @property {number} blockNumber - Block number where transaction was mined
 * @property {number} timestamp - Unix timestamp of transaction
 * @property {string} from - Sender address
 * @property {string} to - Recipient address
 * @property {string} value - Transaction value in wei
 * @property {string} gasUsed - Gas used by transaction
 * @property {string} gasPrice - Gas price in wei
 * @property {'success'|'pending'|'failed'} status - Transaction status
 * @property {number} chainId - Chain ID where transaction occurred
 * @property {CrossChainInfo} [crossChainData] - Optional cross-chain information
 */

/**
 * Cross-chain information
 * @typedef {Object} CrossChainInfo
 * @property {ChainInfo} sourceChain - Source chain information
 * @property {ChainInfo} destinationChain - Destination chain information
 * @property {string} bridgeContract - Bridge contract address
 * @property {TokenInfo} tokenInfo - Token information being transferred
 * @property {string} [crossChainTxHash] - Optional cross-chain transaction hash
 */

/**
 * Chain information
 * @typedef {Object} ChainInfo
 * @property {number} chainId - Chain ID
 * @property {string} name - Chain name
 * @property {string} rpcUrl - RPC endpoint URL
 * @property {string} explorerUrl - Block explorer URL
 * @property {Object} nativeCurrency - Native currency information
 * @property {string} nativeCurrency.name - Currency name
 * @property {string} nativeCurrency.symbol - Currency symbol
 * @property {number} nativeCurrency.decimals - Currency decimals
 */

/**
 * Token information
 * @typedef {Object} TokenInfo
 * @property {string} address - Token contract address
 * @property {string} symbol - Token symbol
 * @property {number} decimals - Token decimals
 * @property {string} amount - Token amount
 */

/**
 * Graph data structure
 * @typedef {Object} GraphData
 * @property {GraphNode[]} nodes - Array of graph nodes
 * @property {GraphEdge[]} edges - Array of graph edges
 */

/**
 * Graph node
 * @typedef {Object} GraphNode
 * @property {string} id - Unique node identifier
 * @property {'chain'|'address'|'contract'} type - Node type
 * @property {string} label - Display label for node
 * @property {ChainInfo|AddressInfo|ContractInfo} data - Node data
 * @property {Object} [position] - Optional position coordinates
 * @property {number} [position.x] - X coordinate
 * @property {number} [position.y] - Y coordinate
 * @property {NodeStyle} style - Node styling information
 */

/**
 * Graph edge
 * @typedef {Object} GraphEdge
 * @property {string} id - Unique edge identifier
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 * @property {TransactionData} data - Transaction data for this edge
 * @property {EdgeStyle} style - Edge styling information
 */

/**
 * Address information
 * @typedef {Object} AddressInfo
 * @property {string} address - Wallet or contract address
 * @property {string} [label] - Optional address label
 * @property {'wallet'|'contract'|'bridge'} type - Address type
 * @property {number} transactionCount - Number of transactions
 */

/**
 * Contract information
 * @typedef {Object} ContractInfo
 * @property {string} address - Contract address
 * @property {string} name - Contract name
 * @property {'omnichain'|'bridge'|'token'} contractType - Contract type
 * @property {number[]} supportedChains - Array of supported chain IDs
 */

/**
 * Node styling
 * @typedef {Object} NodeStyle
 * @property {string} backgroundColor - Background color
 * @property {string} borderColor - Border color
 * @property {number} borderWidth - Border width in pixels
 * @property {number} size - Node size
 * @property {'pulse'|'glow'|'none'} [animation] - Optional animation type
 */

/**
 * Edge styling
 * @typedef {Object} EdgeStyle
 * @property {string} lineColor - Line color
 * @property {number} lineWidth - Line width in pixels
 * @property {string} targetArrowColor - Arrow color
 * @property {'flow'|'pulse'|'none'} [animation] - Optional animation type
 */

export {};
