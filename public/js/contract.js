// js/contract.js
class ContractManager {
    constructor(authManager) {
        this.auth = authManager;
        this.web3 = authManager.web3;
        this.contract = null;
        this.currentNetwork = null;

        this.init();
    }

    async init() {
        await this.detectNetwork();
        await this.loadContract();
    }

    async detectNetwork() {
        try {
            const chainId = await this.web3.eth.getChainId();
            this.currentNetwork = '0x' + chainId.toString(16);
            console.log('🌐 Current network:', this.currentNetwork);
        } catch (error) {
            console.error('Error detecting network:', error);
        }
    }

    async loadContract() {
        const address = CONFIG.CONTRACT_ADDRESSES[this.currentNetwork];

        if (!address) {
            console.warn('No contract address for current network');
            return;
        }

        try {
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, address);
            console.log('✅ Contract loaded:', address);

            // Проверяем связь с контрактом
            const roundCounter = await this.contract.methods.roundCounter().call();
            console.log('📊 Current round count:', roundCounter);
        } catch (error) {
            console.error('Error loading contract:', error);
        }
    }

    async startRound(userA, userB) {
        if (!this.auth.requireRole(CONFIG.ROLES.CLIENT)) return null;

        try {
            this.showTransactionModal('Starting new round...');

            const result = await this.contract.methods.startRound(userA, userB).send({
                from: this.auth.currentAccount,
                gas: 300000
            });

            const roundId = result.events.RoundStarted.returnValues.roundId;

            this.hideTransactionModal();
            this.auth.showSuccess(`Round started successfully! Round ID: ${roundId}`);

            return roundId;

        } catch (error) {
            this.hideTransactionModal();
            console.error('Error starting round:', error);
            this.auth.showError('Failed to start round: ' + error.message);
            return null;
        }
    }

    async makeDeposit(roundId, amount) {
        if (!this.auth.requireRole(CONFIG.ROLES.CLIENT)) return false;

        try {
            this.showTransactionModal('Making deposit...');

            const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');

            await this.contract.methods.deposit(roundId).send({
                from: this.auth.currentAccount,
                value: amountWei,
                gas: 200000
            });

            this.hideTransactionModal();
            this.auth.showSuccess('Deposit successful!');
            return true;

        } catch (error) {
            this.hideTransactionModal();
            console.error('Error making deposit:', error);
            this.auth.showError('Failed to make deposit: ' + error.message);
            return false;
        }
    }

    async distributeRound(roundId, amount) {
        if (!this.auth.requireRole(CONFIG.ROLES.JUDGE)) return false;

        try {
            this.showTransactionModal('Distributing round funds...');

            const amountDistrWei = this.web3.utils.toWei(amount.toString(), 'ether');

            await this.contract.methods.depositAndDistribute(roundId).send({
                from: this.auth.currentAccount,
                value: amountDistrWei,
                gas: 300000
            });

            this.hideTransactionModal();
            this.auth.showSuccess('Round distributed successfully!');
            return true;

        } catch (error) {
            this.hideTransactionModal();
            console.error('Error distributing round:', error);
            this.auth.showError('Failed to distribute round: ' + error.message);
            return false;
        }
    }

    async refundWithFee(roundId) {
        if (!this.auth.requireRole(CONFIG.ROLES.JUDGE)) return false;

        try {
            this.showTransactionModal('refundWithFee round funds...');

            await this.contract.methods.refundWithFee(roundId).send({
                from: this.auth.currentAccount,
                gas: 300000
            });

            this.hideTransactionModal();
            this.auth.showSuccess('Round refundWithFee successfully!');
            return true;

        } catch (error) {
            this.hideTransactionModal();
            console.error('Error refundWithFee round:', error);
            this.auth.showError('Failed to refundWithFee round: ' + error.message);
            return false;
        }
    }

    async getRoundStatus(roundId) {
        try {
            const status = await this.contract.methods.getRoundStatus(roundId).call();
            return {
                userA: status[0],
                userB: status[1],
                userC: status[2],
                amountA: status[3],
                amountB: status[4],
                amountC: status[5],
                completed: status[6],
                refunded: status[7]
            };
        } catch (error) {
            console.error('Error getting round status:', error);
            return null;
        }
    }

    async getRoundDeposits(roundId) {
        try {
            const deposits = await this.contract.methods.getRoundDeposits(roundId).call();
            return {
                depositedA: deposits[0],
                depositedB: deposits[1],
                depositedC: deposits[2]
            };
        } catch (error) {
            console.error('Error getting round deposits:', error);
            return null;
        }
    }

    async getRoundCounter() {
        try {
            return await this.contract.methods.roundCounter().call();
        } catch (error) {
            console.error('Error getting round counter:', error);
            return 0;
        }
    }

    // Метод для админа: развертывание нового контракта (если нужно)
    async deployNewContract(contractABI, contractBytecode) {
        if (!this.auth.requireRole(CONFIG.ROLES.ADMIN)) return null;

        try {
            this.showTransactionModal('Deploying new contract...');

            const contract = new this.web3.eth.Contract(contractABI);
            const deployTx = contract.deploy({
                data: contractBytecode
            });

            const gasEstimate = await deployTx.estimateGas({
                from: this.auth.currentAccount
            });

            const deployedContract = await deployTx.send({
                from: this.auth.currentAccount,
                gas: gasEstimate
            });

            this.hideTransactionModal();
            this.auth.showSuccess(`Contract deployed successfully! Address: ${deployedContract.options.address}`);

            return deployedContract.options.address;

        } catch (error) {
            this.hideTransactionModal();
            console.error('Error deploying contract:', error);
            this.auth.showError('Failed to deploy contract: ' + error.message);
            return null;
        }
    }

    // Вспомогательные методы для UI
    showTransactionModal(message) {
        const modal = document.getElementById('modal-overlay');
        const messageEl = document.getElementById('transaction-message');

        messageEl.textContent = message;
        modal.classList.add('active');
    }

    hideTransactionModal() {
        const modal = document.getElementById('modal-overlay');
        modal.classList.remove('active');
    }

    updateTransactionLink(txHash) {
        const link = document.getElementById('transaction-link');
        const explorer = CONFIG.NETWORK_CONFIGS[this.currentNetwork]?.explorer;

        if (explorer && txHash) {
            link.href = `${explorer}/tx/${txHash}`;
            link.style.display = 'block';
        }
    }
}