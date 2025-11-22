class MultiPartyApp {
    constructor() {
        this.auth = new AuthManager();
        this.contract = new ContractManager(this.auth);
        this.currentPage = 'home';

        this.init();
    }

    async init() {
        await this.auth.init();
        await this.contract.init();

        this.setupNavigation();
        this.setupEventListeners();
        this.showPage('home');

        // Скрываем страницу загрузки
        document.getElementById('loading-page').classList.remove('active');
    }

    setupNavigation() {
        // Навигация по ссылкам
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1);
                this.showPage(page);
            });
        });

        // Кнопки на главной странице
        document.querySelector('.goto-client').addEventListener('click', () => {
            this.showPage('client');
        });

        document.querySelector('.goto-judge').addEventListener('click', () => {
            this.showPage('judge');
        });

        document.querySelector('.goto-admin').addEventListener('click', () => {
            this.showPage('admin');
        });
    }

    setupEventListeners() {
        // Клиентские действия
        document.getElementById('client-start-round').addEventListener('click', () => {
            this.handleStartRound();
        });

        document.getElementById('client-make-deposit').addEventListener('click', () => {
            this.handleMakeDeposit();
        });

        // Действия судьи
        document.getElementById('judge-distribute').addEventListener('click', () => {
            this.handleDistributeRound();
        });

        // Админские действия
        document.getElementById('admin-deploy-contract').addEventListener('click', () => {
            this.handleDeployContract();
        });

        document.getElementById('admin-add-judge').addEventListener('click', () => {
            this.handleAddJudge();
        });

        document.getElementById('admin-remove-judge').addEventListener('click', () => {
            this.handleRemoveJudge();
        });
    }

    showPage(pageName) {
        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Показываем выбранную страницу
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;

            // Обновляем навигацию
            this.updateActiveNavLink(pageName);

            // Загружаем данные для страницы
            this.loadPageData(pageName);
        }
    }

    updateActiveNavLink(pageName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[href="#${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    async loadPageData(pageName) {
        switch (pageName) {
            case 'client':
                await this.loadClientData();
                break;
            case 'judge':
                await this.loadJudgeData();
                break;
            case 'admin':
                await this.loadAdminData();
                break;
        }
    }

    async loadClientData() {
        if (!this.auth.currentAccount) return;

        try {
            const roundCounter = await this.contract.getRoundCounter();
            const rounds = [];

            // Загружаем все раунды, где текущий аккаунт является userA, userB или userC
            for (let i = 1; i <= roundCounter; i++) {
                const status = await this.contract.getRoundStatus(i);
                if (status) {
                    if (status.userA.toLowerCase() === this.auth.currentAccount.toLowerCase() ||
                        status.userB.toLowerCase() === this.auth.currentAccount.toLowerCase() ||
                        status.userC.toLowerCase() === this.auth.currentAccount.toLowerCase()) {
                        rounds.push({
                            id: i,
                            ...status
                        });
                    }
                }
            }

            this.displayClientRounds(rounds);
        } catch (error) {
            console.error('Error loading client rounds:', error);
        }
    }

    displayClientRounds(rounds) {
        const container = document.getElementById('client-rounds-list');
        if (rounds.length === 0) {
            container.innerHTML = '<p>No rounds found.</p>';
            return;
        }

        const roundsHTML = rounds.map(round => `
            <div class="round-item">
                <div class="round-header">
                    <span class="round-id">Round #${round.id}</span>
                    <span class="round-status ${round.completed ? 'status-completed' : 'status-active'}">
                        ${round.completed ? 'Completed' : 'Active'}
                    </span>
                </div>
                <div class="round-details">
                    <p><strong>User A:</strong> ${this.auth.formatAddress(round.userA)}</p>
                    <p><strong>User B:</strong> ${this.auth.formatAddress(round.userB)}</p>
                    <p><strong>User C (Judge):</strong> ${this.auth.formatAddress(round.userC)}</p>
                    <p><strong>Amounts:</strong>
                        A: ${this.web3.utils.fromWei(round.amountA, 'ether')} BNB,
                        B: ${this.web3.utils.fromWei(round.amountB, 'ether')} BNB,
                        C: ${this.web3.utils.fromWei(round.amountC, 'ether')} BNB
                    </p>
                </div>
            </div>
        `).join('');

        container.innerHTML = roundsHTML;
    }

    async loadJudgeData() {
        if (!this.auth.currentAccount) return;

        try {
            const roundCounter = await this.contract.getRoundCounter();
            const activeRounds = [];

            for (let i = 1; i <= roundCounter; i++) {
                const status = await this.contract.getRoundStatus(i);
                if (status && status.userC.toLowerCase() === this.auth.currentAccount.toLowerCase() && !status.completed) {
                    activeRounds.push({
                        id: i,
                        ...status
                    });
                }
            }

            this.displayJudgeActiveRounds(activeRounds);
        } catch (error) {
            console.error('Error loading judge rounds:', error);
        }
    }

    async loadAdminData() {
        try {
            const roundCounter = await this.contract.getRoundCounter();
            let totalValue = 0;
            let activeRounds = 0;

            for (let i = 1; i <= roundCounter; i++) {
                const status = await this.contract.getRoundStatus(i);
                if (status) {
                    totalValue += parseFloat(this.web3.utils.fromWei(status.amountA, 'ether'));
                    totalValue += parseFloat(this.web3.utils.fromWei(status.amountB, 'ether'));
                    totalValue += parseFloat(this.web3.utils.fromWei(status.amountC, 'ether'));

                    if (!status.completed) {
                        activeRounds++;
                    }
                }
            }

            document.getElementById('total-rounds').textContent = roundCounter;
            document.getElementById('active-rounds').textContent = activeRounds;
            document.getElementById('total-value').textContent = totalValue.toFixed(2) + ' BNB';
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    displayJudgeActiveRounds(rounds) {
        const container = document.getElementById('judge-active-rounds');
        if (rounds.length === 0) {
            container.innerHTML = '<p>No active rounds found.</p>';
            return;
        }

        const roundsHTML = rounds.map(round => `
            <div class="round-item">
                <div class="round-header">
                    <span class="round-id">Round #${round.id}</span>
                    <span class="round-status status-active">Active</span>
                </div>
                <div class="round-details">
                    <p><strong>User A:</strong> ${this.auth.formatAddress(round.userA)}</p>
                    <p><strong>User B:</strong> ${this.auth.formatAddress(round.userB)}</p>
                    <p><strong>Amounts:</strong>
                        A: ${this.web3.utils.fromWei(round.amountA, 'ether')} BNB,
                        B: ${this.web3.utils.fromWei(round.amountB, 'ether')} BNB
                    </p>
                </div>
                <button class="btn-primary" onclick="app.handleDistributeRound(${round.id})">Distribute</button>
            </div>
        `).join('');

        container.innerHTML = roundsHTML;
    }

    // Обработчики действий
    async handleStartRound() {
        const userA = document.getElementById('client-userA').value.trim();
        const userB = document.getElementById('client-userB').value.trim();

        if (!this.web3.utils.isAddress(userA) || !this.web3.utils.isAddress(userB)) {
            this.auth.showError('Please enter valid Ethereum addresses');
            return;
        }

        const roundId = await this.contract.startRound(userA, userB);
        if (roundId) {
            // Очищаем форму
            document.getElementById('client-userA').value = '';
            document.getElementById('client-userB').value = '';
        }
    }

    async handleMakeDeposit() {
        const roundId = document.getElementById('client-round-id').value;
        const amount = document.getElementById('client-deposit-amount').value;

        if (!roundId || !amount) {
            this.auth.showError('Please enter round ID and amount');
            return;
        }

        const success = await this.contract.makeDeposit(roundId, amount);
        if (success) {
            // Очищаем форму
            document.getElementById('client-round-id').value = '';
            document.getElementById('client-deposit-amount').value = '';
        }
    }

    async handleDistributeRound() {
        const roundId = document.getElementById('judge-round-id').value;

        if (!roundId) {
            this.auth.showError('Please enter round ID');
            return;
        }

        const success = await this.contract.distributeRound(roundId);
        if (success) {
            document.getElementById('judge-round-id').value = '';
        }
    }

    async handleDeployContract() {
        const version = document.getElementById('contract-version').value;

        const address = await this.contract.deployNewContract(version);
        if (address) {
            // Можно обновить интерфейс или показать информацию о новом контракте
        }
    }

    async handleAddJudge() {
        // Логика добавления судьи
        this.auth.showInfo('Add judge functionality coming soon...');
    }

    async handleRemoveJudge() {
        // Логика удаления судьи
        this.auth.showInfo('Remove judge functionality coming soon...');
    }

    get web3() {
        return this.auth.web3;
    }
}

// Инициализация приложения когда DOM загружен
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MultiPartyApp();
});