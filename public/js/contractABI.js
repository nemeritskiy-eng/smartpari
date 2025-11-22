// В отдельном файле contractABI.js
export const contractABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "_userA", "type": "address"},
            {"internalType": "address", "name": "_userB", "type": "address"}
        ],
        "name": "startRound",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_roundId", "type": "uint256"}],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    // ... остальные функции из вашего контракта
];