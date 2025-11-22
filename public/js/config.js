
const CONFIG = {
    CONTRACT_ADDRESSES: {
        '0x38': '0x6Fdd83A91A05035c4f4698A80599a51a687d7498', // BSC Mainnet
        '0x61': 'YOUR_BSC_TESTNET_ADDRESS', // BSC Testnet
        '0x1': 'YOUR_ETH_MAINNET_ADDRESS',  // Ethereum Mainnet
    },
    NETWORK_CONFIGS: {
        '0x38': {
            name: 'BSC Mainnet',
            symbol: 'BNB',
            explorer: 'https://bscscan.com',
            rpcUrl: 'https://bsc-dataseed.binance.org/'
        },
        '0x61': {
            name: 'BSC Testnet',
            symbol: 'BNB',
            explorer: 'https://testnet.bscscan.com',
            rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
        },
        '0x1': {
            name: 'Ethereum Mainnet',
            symbol: 'ETH',
            explorer: 'https://etherscan.io',
            rpcUrl: 'https://mainnet.infura.io/v3/'
        }
    },
    ROLES: {
        CLIENT: 'client',
        JUDGE: 'judge',
        ADMIN: 'admin'
    }
};

const CONTRACT_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roundId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "userType",
				"type": "string"
			}
		],
		"name": "DepositMade",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roundId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "prize",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "userC",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "userCPrize",
				"type": "uint256"
			}
		],
		"name": "DistributionCompleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roundId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "userC",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feeA",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feeB",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalFee",
				"type": "uint256"
			}
		],
		"name": "RefundWithFee",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roundId",
				"type": "uint256"
			}
		],
		"name": "RoundExpired",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "roundId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "userA",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "userB",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "initiatorC",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			}
		],
		"name": "RoundStarted",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "ROUND_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "depositAndDistribute",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "emergencyWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "forceDistribution",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "getRoundDeadline",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "getRoundDeposits",
		"outputs": [
			{
				"internalType": "bool",
				"name": "depositedA",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "depositedB",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "depositedC",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "getRoundStatus",
		"outputs": [
			{
				"internalType": "address",
				"name": "userA",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "userB",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "userC",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amountA",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "amountB",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "amountC",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "completed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "refunded",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_roundId",
				"type": "uint256"
			}
		],
		"name": "refundWithFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "roundCounter",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "rounds",
		"outputs": [
			{
				"internalType": "address",
				"name": "userA",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "userB",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "userC",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amountA",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "amountB",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "amountC",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "depositedA",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "depositedB",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "depositedC",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "completed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "refunded",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_userA",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_userB",
				"type": "address"
			}
		],
		"name": "startRound",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]; // ABI контракта