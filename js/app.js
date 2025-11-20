class DApp {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        
        this.init();
    }

    async init() {
        // Инициализация Web3
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            await this.initContract();
            this.bindEvents();
        } else {
            alert('Please install MetaMask!');
        }
    }

    async initContract() {
        const contractAddress = 'YOUR_CONTRACT_ADDRESS'; // Замените на реальный адрес
        this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
    }

    bindEvents() {
        document.getElementById('connect-wallet').addEventListener('click', () => this.connectWallet());
        document.getElementById('start-round').addEventListener('click', () => this.startRound());
        document.getElementById('make-deposit').addEventListener('click', () => this.makeDeposit());
        document.getElementById('check-round').addEventListener('click', () => this.checkRound());
    }

    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.account = accounts[0];
            
            // Обновляем UI
            document.getElementById('wallet-address').textContent = 
                `${this.account.substring(0, 6)}...${this.account.substring(38)}`;
            
            // Показываем разделы приложения
            document.getElementById('create-round').style.display = 'block';
            document.getElementById('deposit-section').style.display = 'block';
            document.getElementById('wallet-info').style.display = 'block';
            document.getElementById('connect-wallet').style.display = 'none';
            
            // Получаем баланс
            await this.getBalance();
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
        }
    }

    async getBalance() {
        const balance = await this.web3.eth.getBalance(this.account);
        const balanceETH = this.web3.utils.fromWei(balance, 'ether');
        document.getElementById('wallet-balance').textContent = balanceETH;
    }

    async startRound() {
        const userA = document.getElementById('userA').value;
        const userB = document.getElementById('userB').value;
        
        if (!userA || !userB) {
            alert('Please enter both addresses');
            return;
        }

        try {
            const result = await this.contract.methods.startRound(userA, userB).send({
                from: this.account,
                gas: 300000
            });
            
            alert(`Round started! Round ID: ${result.events.RoundStarted.returnValues.roundId}`);
            
        } catch (error) {
            console.error('Error starting round:', error);
            alert('Error starting round: ' + error.message);
        }
    }

    async makeDeposit() {
        const roundId = document.getElementById('round-id').value;
        const amountETH = document.getElementById('deposit-amount').value;
        
        if (!roundId || !amountETH) {
            alert('Please enter round ID and amount');
            return;
        }

        try {
            const amountWei = this.web3.utils.toWei(amountETH, 'ether');
            
            const result = await this.contract.methods.deposit(roundId).send({
                from: this.account,
                value: amountWei,
                gas: 200000
            });
            
            alert('Deposit successful!');
            
        } catch (error) {
            console.error('Error making deposit:', error);
            alert('Error making deposit: ' + error.message);
        }
    }

    async checkRound() {
        const roundId = document.getElementById('check-round-id').value;
        
        if (!roundId) {
            alert('Please enter round ID');
            return;
        }

        try {
            const status = await this.contract.methods.getRoundStatus(roundId).call();
            const deposits = await this.contract.methods.getRoundDeposits(roundId).call();
            
            const details = `
                <p><strong>User A:</strong> ${status.userA}</p>
                <p><strong>User B:</strong> ${status.userB}</p>
                <p><strong>User C:</strong> ${status.userC}</p>
                <p><strong>Amount A:</strong> ${this.web3.utils.fromWei(status.amountA, 'ether')} ETH</p>
                <p><strong>Amount B:</strong> ${this.web3.utils.fromWei(status.amountB, 'ether')} ETH</p>
                <p><strong>Amount C:</strong> ${this.web3.utils.fromWei(status.amountC, 'ether')} ETH</p>
                <p><strong>Deposited A:</strong> ${deposits.depositedA ? 'Yes' : 'No'}</p>
                <p><strong>Deposited B:</strong> ${deposits.depositedB ? 'Yes' : 'No'}</p>
                <p><strong>Deposited C:</strong> ${deposits.depositedC ? 'Yes' : 'No'}</p>
                <p><strong>Completed:</strong> ${status.completed ? 'Yes' : 'No'}</p>
                <p><strong>Refunded:</strong> ${status.refunded ? 'Yes' : 'No'}</p>
            `;
            
            document.getElementById('round-details').innerHTML = details;
            
        } catch (error) {
            console.error('Error checking round:', error);
            alert('Error checking round: ' + error.message);
        }
    }
}

// Запуск приложения
new DApp();