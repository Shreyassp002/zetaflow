/**
 * @fileoverview ZetaChain-specific data type definitions
 * Defines JSDoc types for cross-chain transactions, omnichain events, and cross-chain messaging
 */

/**
 * ZetaChain cross-chain transaction
 * @typedef {Object} CrossChainTransaction
 * @property {string} txHash - Transaction hash
 * @property {ChainInfo} sourceChain - Source chain information
 * @property {ChainInfo} destinationChain - Destination chain information
 * @property {string} [omnichainContract] - Optional omnichain contract address
 * @property {CrossChainMessage[]} crossChainMessages - Array of cross-chain messages
 * @property {'pending'|'completed'|'failed'} status - Transaction status
 * @property {number} timestamp - Transaction timestamp
 * @property {TokenInfo} [tokenInfo] - Optional token information
 * @property {string} amount - Transaction amount
 * @property {number} confirmations - Number of confirmations
 */

/**
 * Omnichain event data
 * @typedef {Object} OmnichainEvent
 * @property {'transfer'|'swap'|'contract_call'|'message'} eventType - Event type
 * @property {number} sourceChain - Source chain ID
 * @property {number} destinationChain - Destination chain ID
 * @property {string} txHash - Transaction hash
 * @property {number} blockNumber - Block number
 * @property {number} timestamp - Event timestamp
 * @property {string} contractAddress - Omnichain contract address
 * @property {Object} data - Event-specific data
 * @property {string} [data.amount] - Transfer amount (for transfers)
 * @property {string} [data.token] - Token address (for token events)
 * @property {string} [data.recipient] - Recipient address
 * @property {string} [data.calldata] - Contract call data (for contract calls)
 */

/**
 * Cross-chain message
 * @typedef {Object} CrossChainMessage
 * @property {string} messageId - Unique message identifier
 * @property {number} sourceChain - Source chain ID
 * @property {number} destinationChain - Destination chain ID
 * @property {'token_transfer'|'contract_call'|'data_message'} messageType - Message type
 * @property {Object} payload - Message payload data
 * @property {'sent'|'received'|'executed'|'failed'} status - Message status
 * @property {number} timestamp - Message timestamp
 * @property {string} [txHash] - Associated transaction hash
 * @property {number} [gasLimit] - Gas limit for execution
 * @property {string} [gasPrice] - Gas price for execution
 */

/**
 * ZetaChain network information
 * @typedef {Object} ZetaNetworkInfo
 * @property {number} chainId - ZetaChain network ID
 * @property {string} name - Network name
 * @property {string} rpcUrl - RPC endpoint
 * @property {string} explorerUrl - Block explorer URL
 * @property {string} explorerApiUrl - Explorer API URL
 * @property {'mainnet'|'testnet'} networkType - Network type
 * @property {ConnectedChain[]} connectedChains - Connected external chains
 */

/**
 * Connected external chain information
 * @typedef {Object} ConnectedChain
 * @property {number} chainId - External chain ID
 * @property {string} name - Chain name
 * @property {string} symbol - Native token symbol
 * @property {string} rpcUrl - Chain RPC URL
 * @property {string} explorerUrl - Chain explorer URL
 * @property {boolean} isSupported - Whether chain is supported for cross-chain
 */

/**
 * Omnichain contract information
 * @typedef {Object} OmnichainContract
 * @property {string} address - Contract address on ZetaChain
 * @property {string} name - Contract name
 * @property {string} [description] - Contract description
 * @property {number[]} supportedChains - Array of supported external chain IDs
 * @property {ContractFunction[]} functions - Available contract functions
 * @property {boolean} isVerified - Whether contract is verified
 */

/**
 * Omnichain contract function
 * @typedef {Object} ContractFunction
 * @property {string} name - Function name
 * @property {string} signature - Function signature
 * @property {'read'|'write'|'crosschain'} type - Function type
 * @property {FunctionParameter[]} inputs - Function input parameters
 * @property {FunctionParameter[]} outputs - Function output parameters
 */

/**
 * Contract function parameter
 * @typedef {Object} FunctionParameter
 * @property {string} name - Parameter name
 * @property {string} type - Parameter type (e.g., 'uint256', 'address')
 * @property {boolean} indexed - Whether parameter is indexed (for events)
 */

/**
 * Cross-chain transfer details
 * @typedef {Object} CrossChainTransfer
 * @property {string} transferId - Unique transfer identifier
 * @property {number} sourceChain - Source chain ID
 * @property {number} destinationChain - Destination chain ID
 * @property {string} sourceAddress - Source address
 * @property {string} destinationAddress - Destination address
 * @property {TokenInfo} token - Token being transferred
 * @property {string} amount - Transfer amount
 * @property {TransferStep[]} steps - Transfer execution steps
 * @property {'initiated'|'processing'|'completed'|'failed'} status - Transfer status
 * @property {number} timestamp - Transfer initiation timestamp
 */

/**
 * Transfer execution step
 * @typedef {Object} TransferStep
 * @property {number} stepNumber - Step sequence number
 * @property {string} description - Step description
 * @property {string} txHash - Transaction hash for this step
 * @property {number} chainId - Chain where step occurs
 * @property {'pending'|'completed'|'failed'} status - Step status
 * @property {number} [timestamp] - Step completion timestamp
 * @property {string} [errorMessage] - Error message if step failed
 */

export {};
