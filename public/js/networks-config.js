// networks-config.js
const NETWORKS = {
    ETHEREUM_MAINNET: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/']
    },
    BSC_MAINNET: {
        chainId: '0x38',
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: [
            'https://bsc-dataseed.binance.org/',
            'https://bsc-dataseed1.defibit.io/',
            'https://bsc-dataseed1.ninicoin.io/'
        ],
        blockExplorerUrls: ['https://bscscan.com/']
    },
    BSC_TESTNET: {
        chainId: '0x61',
        chainName: 'BNB Smart Chain Testnet',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/'
        ],
        blockExplorerUrls: ['https://testnet.bscscan.com/']
    },
    POLYGON_MAINNET: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
    }
};

// Конфигурация для разных сетей
const NETWORK_CONFIGS = {
    '0x1': {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://etherscan.io',
        gasPrice: '20' // Gwei
    },
    '0x38': {
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        explorer: 'https://bscscan.com',
        gasPrice: '5' // Gwei
    },
    '0x61': {
        name: 'BSC Testnet',
        symbol: 'BNB',
        explorer: 'https://testnet.bscscan.com',
        gasPrice: '10' // Gwei
    },
    '0x89': {
        name: 'Polygon',
        symbol: 'MATIC',
        explorer: 'https://polygonscan.com',
        gasPrice: '30' // Gwei
    }
};