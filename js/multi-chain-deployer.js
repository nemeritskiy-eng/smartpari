// multi-chain-deployer.js
class MultiChainDeployer {
    constructor() {
        this.web3 = null;
        this.selectedChainId = '0x38'; // BSC Mainnet по умолчанию
        this.currentAccount = null;
        this.gasPriceInterval = null;

        this.init();
    }

    async init() {
        this.setupNetworkSelector();
        this.setupEventListeners();

        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            await this.checkCurrentNetwork();
            this.startGasPriceMonitoring();
        } else {
            this.showError('Please install MetaMask');
        }
    }

    setupNetworkSelector() {
        const options = document.querySelectorAll('.network-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Убираем выделение у всех
                options.forEach(opt => opt.classList.remove('selected'));
                // Выделяем выбранную
                option.classList.add('selected');

                this.selectedChainId = option.dataset.chain;
                this.updateNetworkInfo();
            });
        });

        // Выбираем BSC по умолчанию
        document.querySelector('[data-chain="0x38"]').classList.add('selected');
    }

    setupEventListeners() {
        document.getElementById('deploy-contract-btn').addEventListener('click', () => {
            this.deployContract();
        });

        document.getElementById('switch-network-btn').addEventListener('click', () => {
            this.switchNetwork();
        });

        // Слушаем смену сети в MetaMask
        if (window.ethereum) {
            window.ethereum.on('chainChanged', (chainId) => {
                this.selectedChainId = chainId;
                this.updateNetworkInfo();
                this.checkNetworkMatch();
            });

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.checkCurrentNetwork();
                }
            });
        }
    }

    async checkCurrentNetwork() {
        try {
            const chainId = await this.web3.eth.getChainId();
            this.selectedChainId = '0x' + chainId.toString(16);
            this.updateNetworkInfo();
            this.checkNetworkMatch();
        } catch (error) {
            console.error('Error checking network:', error);
        }
    }

    updateNetworkInfo() {
        const config = NETWORK_CONFIGS[this.selectedChainId];
        if (!config) return;

        document.getElementById('current-network').textContent = config.name;
        document.getElementById('native-currency').textContent = config.symbol;
        document.getElementById('deploy-network').textContent = config.name;

        // Обновляем текст кнопки
        document.getElementById('deploy-contract-btn').textContent =
            `🚀 Deploy to ${config.name}`;

        this.updateEstimatedCost();
    }

    async updateEstimatedCost() {
        if (!this.web3) return;

        try {
            // Примерная оценка газа для деплоя
            const estimatedGas = 3000000; // Типичный газ для деплоя
            const gasPrice = await this.web3.eth.getGasPrice();
            const increasedGasPrice = Math.floor(Number(gasPrice) * 1.2).toString();
            const gasPriceGwei = this.web3.utils.fromWei(gasPrice, 'gwei');

            const estimatedCostWei = estimatedGas * increasedGasPrice;
            const estimatedCostEth = this.web3.utils.fromWei(estimatedCostWei.toString(), 'ether');

            const config = NETWORK_CONFIGS[this.selectedChainId];
            document.getElementById('estimated-cost').textContent =
                `~${parseFloat(estimatedCostEth).toFixed(4)} ${config.symbol}`;

        } catch (error) {
            console.error('Error estimating cost:', error);
        }
    }

    startGasPriceMonitoring() {
        // Обновляем цену газа каждые 15 секунд
        this.gasPriceInterval = setInterval(async () => {
            if (this.web3) {
                try {
                    const gasPrice = await this.web3.eth.getGasPrice();
                    const gasPriceGwei = this.web3.utils.fromWei(gasPrice, 'gwei');
                    document.getElementById('current-gas-price').textContent =
                        parseFloat(gasPriceGwei).toFixed(2);

                    this.updateEstimatedCost();
                } catch (error) {
                    console.error('Error updating gas price:', error);
                }
            }
        }, 15000);
    }

    async checkNetworkMatch() {
        const currentChainId = await this.web3.eth.getChainId();
        const currentChainHex = '0x' + currentChainId.toString(16);

        const switchBtn = document.getElementById('switch-network-btn');

        if (currentChainHex !== this.selectedChainId) {
            switchBtn.style.display = 'block';
            switchBtn.textContent = `🔄 Switch to ${NETWORK_CONFIGS[this.selectedChainId].name}`;
        } else {
            switchBtn.style.display = 'none';
        }
    }

    async switchNetwork() {
        try {
            const networkConfig = NETWORKS[this.getNetworkKey(this.selectedChainId)];

            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.selectedChainId }]
            });

        } catch (switchError) {
            // Если сеть не добавлена в MetaMask
            if (switchError.code === 4902) {
                try {
                    const networkConfig = NETWORKS[this.getNetworkKey(this.selectedChainId)];
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [networkConfig]
                    });
                } catch (addError) {
                    this.showError(`Failed to add network: ${addError.message}`);
                }
            } else {
                this.showError(`Failed to switch network: ${switchError.message}`);
            }
        }
    }

    getNetworkKey(chainId) {
        const keys = {
            '0x1': 'ETHEREUM_MAINNET',
            '0x38': 'BSC_MAINNET',
            '0x61': 'BSC_TESTNET',
            '0x89': 'POLYGON_MAINNET'
        };
        return keys[chainId];
    }

    async deployContract() {
        const statusDiv = document.getElementById('deploy-status');

        try {
            // Проверяем подключенную сеть
            const currentChainId = await this.web3.eth.getChainId();
            const currentChainHex = '0x' + currentChainId.toString(16);

            if (currentChainHex !== this.selectedChainId) {
                const shouldSwitch = confirm(
                    `You are on ${NETWORK_CONFIGS[currentChainHex].name}. ` +
                    `Switch to ${NETWORK_CONFIGS[this.selectedChainId].name} to deploy?`
                );

                if (shouldSwitch) {
                    await this.switchNetwork();
                    return;
                }
            }

            statusDiv.innerHTML = '<p style="color: orange">🔄 Requesting account access...</p>';

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.currentAccount = accounts[0];
            const config = NETWORK_CONFIGS[this.selectedChainId];

            statusDiv.innerHTML = `<p style="color: orange">🔄 Deploying to ${config.name}...</p>`;

             // Проверяем наличие pending-транзакций
             const pendingTxs = await this.checkPendingTransactions(this.currentAccount);
             if (pendingTxs > 0) {
                const shouldProceed = confirm(
                'You have ${pendingTxs} pending transactions. ' +
                'It is recommended to wait for them to be mined or cancel them. ' +
                'Do you want to proceed anyway?'
                );
                if (!shouldProceed) {
                    statusDiv.innerHTML = '<p style="color: red">Deployment cancelled due to pending transactions.</p>';
                    return;
                }
             }

            // Деплой контракта
            const contract = new this.web3.eth.Contract(contractABI);

            const gasEstimate = await contract.deploy({
                data: contractBytecode
            }).estimateGas({
                from: this.currentAccount
            });

            const gasPrice = await this.web3.eth.getGasPrice();
            const gasLimit = Math.floor(gasEstimate * 1.2);

            const deployedContract = await contract.deploy({
                data: contractBytecode
            }).send({
                from: this.currentAccount,
                gas: gasLimit,
                gasPrice: gasPrice
            });

            await this.handleSuccessfulDeployment(deployedContract, config);

        } catch (error) {
            this.handleDeploymentError(error);
        }
    }

    // Функция для проверки pending-транзакций
    async checkPendingTransactions(address) {
        try {
            const currentBlock = await this.web3.eth.getBlockNumber();
            const pendingCount = await this.web3.eth.getTransactionCount(address, 'pending');
            const latestCount = await this.web3.eth.getTransactionCount(address, 'latest');
            return pendingCount - latestCount;
        } catch (error) {
            console.error('Error checking pending transactions:', error);
            return 0;
        }
    }

    async handleSuccessfulDeployment(deployedContract, networkConfig) {
        const contractAddress = deployedContract.options.address;
        const statusDiv = document.getElementById('deploy-status');

        statusDiv.innerHTML = `
            <div style="color: green; background: #f0fff0; padding: 20px; border-radius: 10px;">
                <h3>✅ Contract Successfully Deployed!</h3>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <strong>Network:</strong><br>${networkConfig.name}
                    </div>
                    <div>
                        <strong>Contract Address:</strong><br>
                        <code style="word-break: break-all;">${contractAddress}</code>
                    </div>
                </div>

                <div>
                    <strong>Transaction Hash:</strong><br>
                    <code style="word-break: break-all;">${deployedContract.transactionHash}</code>
                </div>

                <div style="margin-top: 15px;">
                    <a href="${networkConfig.explorer}/address/${contractAddress}"
                       target="_blank" style="color: blue; text-decoration: underline; margin-right: 15px;">
                       🔍 View on Explorer
                    </a>
                    <button onclick="copyToClipboard('${contractAddress}')"
                            style="padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 5px;">
                        📋 Copy Address
                    </button>
                </div>
            </div>
        `;

        this.saveToDeploymentHistory(contractAddress, networkConfig, deployedContract);
    }

    saveToDeploymentHistory(address, networkConfig, deployedContract) {
        const deployment = {
            address: address,
            network: networkConfig.name,
            chainId: this.selectedChainId,
            timestamp: new Date().toISOString(),
            transactionHash: deployedContract.transactionHash,
            blockNumber: deployedContract.blockNumber
        };

        let history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]');
        history.unshift(deployment);
        localStorage.setItem('deploymentHistory', JSON.stringify(history));
    }

    handleDeploymentError(error) {
        const statusDiv = document.getElementById('deploy-status');

        let errorMessage = error.message;
        let transactionHash = null;

        // Пытаемся извлечь хэш транзакции из ошибки, если есть
        if (error.transactionHash) {
            transactionHash = error.transactionHash;
        } else if (error.message.includes('transactionHash')) {
            const match = error.message.match(/transactionHash: (0x[a-fA-F0-9]{64})/);
            if (match) {
                transactionHash = match[1];
            }
        }

        let errorHTML = `
            <div style="color: red; background: #fff0f0; padding: 15px; border-radius: 5px;">
                <h3>❌ Deployment Failed</h3>
                <p>${errorMessage}</p>
        `;

        if (transactionHash) {
            const config = NETWORK_CONFIGS[this.selectedChainId];
            errorHTML += `
                <p>Transaction Hash: ${transactionHash}</p>
                <a href="${config.explorer}/tx/${transactionHash}" target="_blank">
                    View on Explorer
                </a>
            `;
        }

        errorHTML += `</div>`;
        statusDiv.innerHTML = errorHTML;
    }
}

// Вспомогательные функции
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Contract address copied to clipboard!');
    });
}

// Инициализация при загрузке
let deployer;
document.addEventListener('DOMContentLoaded', function() {
    deployer = new MultiChainDeployer();
});


