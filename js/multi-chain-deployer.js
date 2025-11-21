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
            const gasPriceGwei = this.web3.utils.fromWei(gasPrice, 'gwei');

            const estimatedCostWei = estimatedGas * gasPrice;
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
            contract.options.data = contractBytecode
            const deployTx = contract.deploy()


            const deployedContract = await deployTx
                .send({
                  from: this.currentAccount,
                  gas: await deployTx.estimateGas(),
                })
                .once("transactionHash", (txhash) => {
                  console.log(`Mining deployment transaction ...`)
                  console.log(`https://${network}.etherscan.io/tx/${txhash}`)
                })

            console.log(`Contract deployed at ${deployedContract.options.address}`)

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

 // Полная диагностика транзакции
    async function diagnoseTransactionFailure() {
        try {
            console.log('🔍 Запускаем полную диагностику...');

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            const account = accounts[0];

            const diagnostics = {
                network: await getNetworkInfo(),
                account: await getAccountInfo(account),
                contract: await getContractInfo(),
                gas: await getGasInfo(),
                simulation: await simulateTransaction()
            };

            console.log('📊 Результаты диагностики:', diagnostics);
            return diagnostics;

        } catch (error) {
            console.error('Ошибка диагностики:', error);
            return { error: error.message };
        }
    }

    async function getNetworkInfo() {
        const chainId = await web3.eth.getChainId();
        const block = await web3.eth.getBlock('latest');

        return {
            chainId: chainId,
            network: getNetworkName(chainId),
            blockNumber: block.number,
            gasLimit: block.gasLimit
        };
    }

    async function getAccountInfo(account) {
        const balance = await web3.eth.getBalance(account);
        const nonce = await web3.eth.getTransactionCount(account, 'pending');

        return {
            address: account,
            balance: web3.utils.fromWei(balance, 'ether'),
            balanceWei: balance,
            pendingNonce: nonce,
            hasMinBalance: BigInt(balance) > BigInt(web3.utils.toWei('0.001', 'ether'))
        };
    }

    async function getContractInfo() {
        return {
            bytecodeLength: CONTRACT_BYTECODE?.length || 0,
            bytecodeValid: CONTRACT_BYTECODE?.startsWith('0x') && CONTRACT_BYTECODE?.length > 100,
            abiFunctions: CONTRACT_ABI?.length || 0,
            hasConstructor: CONTRACT_ABI?.some(item => item.type === 'constructor') || false
        };
    }

    async function getGasInfo() {
        const gasPrice = await web3.eth.getGasPrice();
        return {
            currentGasPrice: web3.utils.fromWei(gasPrice, 'gwei') + ' Gwei',
            recommendedGasLimit: '4700000',
            isGasReasonable: BigInt(gasPrice) < BigInt(web3.utils.toWei('100', 'gwei'))
        };
    }

    function getNetworkName(chainId) {
        const networks = {
            1: 'Ethereum Mainnet',
            56: 'BSC Mainnet',
            97: 'BSC Testnet',
            137: 'Polygon'
        };
        return networks[chainId] || `Unknown (${chainId})`;
    }

    async function simulateTransaction() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            const account = accounts[0];

            // Пробуем симулировать деплой
            const simulationResult = await web3.eth.call({
                from: account,
                data: CONTRACT_BYTECODE,
                gas: '0x47B760', // 4.7 million
                gasPrice: await web3.eth.getGasPrice()
            });

            return {
                success: true,
                result: simulationResult,
                message: 'Симуляция прошла успешно'
            };

        } catch (simulationError) {
            // Извлекаем детальную информацию об ошибке
            const errorDetails = extractErrorDetails(simulationError);
            return {
                success: false,
                error: simulationError.message,
                details: errorDetails,
                suggestedFix: getSuggestedFix(errorDetails)
            };
        }
    }

    function extractErrorDetails(error) {
        const message = error.message.toLowerCase();
        const details = {
            type: 'unknown',
            reason: error.message
        };

        // Распознаем распространенные ошибки
        if (message.includes('out of gas')) {
            details.type = 'out_of_gas';
            details.reason = 'Недостаточно газа для выполнения';
        } else if (message.includes('invalid opcode')) {
            details.type = 'invalid_opcode';
            details.reason = 'Некорректный байткод или ошибка выполнения';
        } else if (message.includes('revert')) {
            details.type = 'revert';
            details.reason = 'Контракт завершил выполнение с ошибкой';
        } else if (message.includes('intrinsic gas too low')) {
            details.type = 'intrinsic_gas';
            details.reason = 'Слишком мало газа для базовых операций';
        } else if (message.includes('insufficient funds')) {
            details.type = 'insufficient_funds';
            details.reason = 'Недостаточно средств для комиссии';
        } else if (message.includes('invalid jump')) {
            details.type = 'invalid_jump';
            details.reason = 'Ошибка в байткоде контракта';
        }

        // Пытаемся извлечь revert reason если есть
        if (error.data) {
            details.revertData = error.data;
            details.revertReason = parseRevertReason(error.data);
        }

        return details;
    }

    function parseRevertReason(revertData) {
        try {
            // Revert reason обычно начинается с 0x08c379a0 (Error selector)
            if (revertData.startsWith('0x08c379a0')) {
                const reason = web3.eth.abi.decodeParameter('string', '0x' + revertData.slice(10));
                return reason;
            }
        } catch (e) {
            // Не удалось декодировать
        }
        return null;
    }

    function getSuggestedFix(errorDetails) {
        const fixes = {
            'out_of_gas': 'Увеличьте лимит газа до 5,000,000+',
            'invalid_opcode': 'Проверьте корректность байткода контракта',
            'revert': 'Исправьте ошибку в логике контракта',
            'intrinsic_gas': 'Установите лимит газа минимум 21,000',
            'insufficient_funds': 'Пополните баланс кошелька',
            'invalid_jump': 'Перекомпилируйте контракт с правильными настройками'
        };

        return fixes[errorDetails.type] || 'Проверьте параметры транзакции и баланс';
    }

    // Детальная проверка байткода
    async function validateContractBytecode() {
        const issues = [];

        if (!CONTRACT_BYTECODE) {
            issues.push('❌ Байткод не загружен');
            return { valid: false, issues };
        }

        // Проверка формата
        if (!CONTRACT_BYTECODE.startsWith('0x')) {
            issues.push('❌ Байткод должен начинаться с 0x');
        }

        // Проверка длины
        const bytecodeLength = CONTRACT_BYTECODE.length;
        if (bytecodeLength < 100) {
            issues.push(`❌ Байткод слишком короткий: ${bytecodeLength} символов`);
        } else if (bytecodeLength > 100000) {
            issues.push(`❌ Байткод слишком длинный: ${bytecodeLength} символов`);
        }

        // Проверка hex формата
        const hexRegex = /^0x[0-9a-fA-F]*$/;
        if (!hexRegex.test(CONTRACT_BYTECODE)) {
            issues.push('❌ Байткод содержит не-hex символы');
        }

        // Проверка на наличие конструктора
        try {
            const contract = new web3.eth.Contract(CONTRACT_ABI);
            const deployment = contract.deploy({ data: CONTRACT_BYTECODE });

            // Пробуем получить данные конструктора
            const encodeData = deployment.encodeABI();
            if (!encodeData || encodeData === '0x') {
                issues.push('⚠️ Не удалось закодировать данные конструктора');
            }
        } catch (error) {
            issues.push(`❌ Ошибка при работе с байткодом: ${error.message}`);
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            bytecodeLength: bytecodeLength,
            isLikelyValid: issues.length === 0 ||
                           (issues.length === 1 && issues[0].includes('⚠️'))
        };
    }

    // Запустите эту функцию для получения полного отчета
    async function runCompleteDiagnostics() {
        console.log('🩺 Запускаем полную диагностику...');

        const results = {
            network: await getNetworkInfo(),
            account: await getAccountInfo((await web3.eth.getAccounts())[0]),
            contract: await validateContractBytecode(),
            simulation: await simulateTransaction(),
            gas: await getGasInfo()
        };

        // Форматируем вывод
        displayDiagnosticsResults(results);
        return results;
    }

    function displayDiagnosticsResults(results) {
        console.group('📊 ДИАГНОСТИКА ТРАНЗАКЦИИ');

        console.log('🌐 СЕТЬ:');
        console.log('- ID:', results.network.chainId);
        console.log('- Название:', results.network.network);
        console.log('- Блок:', results.network.blockNumber);

        console.log('👤 АККАУНТ:');
        console.log('- Адрес:', results.account.address);
        console.log('- Баланс:', results.account.balance, 'BNB');
        console.log('- Достаточно баланса:', results.account.hasMinBalance ? '✅' : '❌');

        console.log('📄 КОНТРАКТ:');
        console.log('- Длина байткода:', results.contract.bytecodeLength);
        console.log('- Валидный байткод:', results.contract.valid ? '✅' : '❌');
        if (results.contract.issues.length > 0) {
            console.log('- Проблемы:', results.contract.issues);
        }

        console.log('⛽ ГАЗ:');
        console.log('- Текущая цена:', results.gas.currentGasPrice);
        console.log('- Рекомендуемый лимит:', results.gas.recommendedGasLimit);

        console.log('🔧 СИМУЛЯЦИЯ:');
        if (results.simulation.success) {
            console.log('- Статус: ✅ УСПЕШНО');
        } else {
            console.log('- Статус: ❌ ОШИБКА');
            console.log('- Ошибка:', results.simulation.error);
            console.log('- Детали:', results.simulation.details);
            console.log('- Решение:', results.simulation.suggestedFix);
        }

        console.groupEnd();

        // Показываем результат в UI
        showDiagnosticsInUI(results);
    }

    function showDiagnosticsInUI(results) {
        const panel = document.getElementById('diagnostics-panel');
        const content = document.getElementById('diagnostics-content');

        panel.style.display = 'block';

        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4>🌐 Сеть</h4>
                    <p><strong>${results.network.network}</strong></p>
                    <p>Блок: ${results.network.blockNumber}</p>
                </div>

                <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4>👤 Аккаунт</h4>
                    <p>Баланс: ${results.account.balance} BNB</p>
                    <p>${results.account.hasMinBalance ? '✅ Достаточно' : '❌ Недостаточно'}</p>
                </div>

                <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4>📄 Контракт</h4>
                    <p>Байткод: ${results.contract.bytecodeLength} chars</p>
                    <p>${results.contract.valid ? '✅ Валидный' : '❌ Ошибки'}</p>
                </div>

                <div style="background: white; padding: 15px; border-radius: 5px;">
                    <h4>⛽ Газ</h4>
                    <p>Цена: ${results.gas.currentGasPrice}</p>
                    <p>${results.gas.isGasReasonable ? '✅ Нормальная' : '⚠️ Высокая'}</p>
                </div>
            </div>
        `;

        // Добавляем результаты симуляции
        if (!results.simulation.success) {
            html += `
                <div style="background: #fff0f0; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <h4 style="color: red;">❌ Ошибка симуляции</h4>
                    <p><strong>${results.simulation.details.reason}</strong></p>
                    <p>Тип: ${results.simulation.details.type}</p>
                    ${results.simulation.details.revertReason ?
                        `<p>Revert reason: ${results.simulation.details.revertReason}</p>` : ''}
                    <p><strong>Решение:</strong> ${results.simulation.suggestedFix}</p>
                </div>
            `;

            // Показываем быстрые исправления
            showQuickFixSuggestions(results.simulation.details.type);
        } else {
            html += `
                <div style="background: #f0fff0; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <h4 style="color: green;">✅ Симуляция успешна</h4>
                    <p>Транзакция должна пройти успешно. Проблема может быть в настройках MetaMask.</p>
                </div>
            `;
        }

        // Показываем проблемы с контрактом
        if (results.contract.issues.length > 0) {
            html += `
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <h4 style="color: orange;">⚠️ Проблемы с контрактом</h4>
                    <ul>
                        ${results.contract.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        content.innerHTML = html;
    }

    function showQuickFixSuggestions(errorType) {
        const suggestionsDiv = document.getElementById('quick-fix-suggestions');
        const fixes = {
            'out_of_gas': `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>🛠️ Быстрое исправление: Недостаточно газа</h4>
                    <p>Увеличьте лимит газа:</p>
                    <button onclick="increaseGasLimit()" style="padding: 8px 15px; margin: 5px;">
                        Установить лимит 5,000,000
                    </button>
                    <button onclick="increaseGasLimit(10000000)" style="padding: 8px 15px; margin: 5px;">
                        Установить лимит 10,000,000
                    </button>
                </div>
            `,
            'insufficient_funds': `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>🛠️ Быстрое исправление: Недостаточно средств</h4>
                    <p>Пополните баланс BNB для комиссий:</p>
                    <p><a href="https://www.binance.com/" target="_blank">Купить BNB на Binance</a></p>
                    <p><a href="https://testnet.binance.org/faucet-smart" target="_blank">Получить тестовый BNB (Testnet)</a></p>
                </div>
            `,
            'invalid_opcode': `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>🛠️ Быстрое исправление: Ошибка байткода</h4>
                    <p>Перекомпилируйте контракт:</p>
                    <button onclick="showRecompileInstructions()" style="padding: 8px 15px; margin: 5px;">
                        Инструкция по перекомпиляции
                    </button>
                </div>
            `
        };

        suggestionsDiv.innerHTML = fixes[errorType] || `
            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4>🛠️ Общие исправления</h4>
                <button onclick="retryWithMoreGas()" style="padding: 8px 15px; margin: 5px;">
                    Попробовать с увеличенным газом
                </button>
                <button onclick="redeployWithFixedBytecode()" style="padding: 8px 15px; margin: 5px;">
                    Переразвернуть с исправленным байткодом
                </button>
            </div>
        `;

        suggestionsDiv.style.display = 'block';
    }

