// js/app.js - обновленная версия
class MultiPartyApp {
    constructor() {
        this.auth = new AuthManager();
        this.contract = new ContractManager(this.auth);
        this.roleManager = new RoleManager(this.auth, this.contract);
        this.roundsManager = new RoundsManager(this.auth, this.contract);
        this.clientPanel = new ClientPanel(this);
        this.judgePanel = new JudgePanel(this);

        this.currentPage = 'home';

        // Связываем AuthManager с приложением
        this.auth.app = this;

        this.init();
    }

    async init() {
        await this.auth.init();
        await this.contract.init();
        await this.roleManager.loadRoleData();
        await this.roundsManager.init();

        this.setupNavigation();
        this.setupEventListeners();
        this.showPage('home');

        // Скрываем страницу загрузки
        document.getElementById('loading-page').classList.remove('active');

        console.log('🚀 Multi-Party Agreement Platform initialized');
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
        document.getElementById('judge-start-round').addEventListener('click', () => {
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
        this.clientPanel.displayClientRounds();
    }

    async loadJudgeData() {
        this.judgePanel.displayJudgeRounds();
        this.judgePanel.displayJudgeHistory();
    }

    async loadAdminData() {
        await this.loadAdminStats();
        this.displayJudgesList();
        this.displayAdminsList();
    }

    async loadAdminStats() {
        const stats = this.roundsManager.getPlatformStats();

        document.getElementById('total-rounds').textContent = stats.totalRounds;
        document.getElementById('active-rounds').textContent = stats.activeRounds;
        document.getElementById('completed-rounds').textContent = stats.completedRounds;
        document.getElementById('total-value').textContent = stats.totalValue + ' BNB';
    }

    displayJudgesList() {
        const container = document.getElementById('judges-list');
        const judges = this.roleManager.getJudgesList();

        if (judges.length === 0) {
            container.innerHTML = '<p>No judges added yet.</p>';
            return;
        }

        const judgesHTML = judges.map(judge => `
            <div class="address-item">
                <span class="address">${this.auth.formatAddress(judge)}</span>
                <button class="btn-danger btn-sm"
                        onclick="app.removeJudge('${judge}')">
                    Remove
                </button>
            </div>
        `).join('');

        container.innerHTML = judgesHTML;
    }

    displayAdminsList() {
        const container = document.getElementById('admins-list');
        const admins = this.roleManager.getAdminsList();

        if (admins.length === 0) {
            container.innerHTML = '<p>No additional admins added.</p>';
            return;
        }

        const adminsHTML = admins.map(admin => `
            <div class="address-item">
                <span class="address">${this.auth.formatAddress(admin)}</span>
                ${admin !== this.auth.currentAccount.toLowerCase() ? `
                    <button class="btn-danger btn-sm"
                            onclick="app.removeAdmin('${admin}')">
                        Remove
                    </button>
                ` : '<span class="badge">Current</span>'}
            </div>
        `).join('');

        container.innerHTML = adminsHTML;
    }

    async addJudge() {
        const address = document.getElementById('judge-address').value.trim();
        if (!address) {
            this.auth.showError('Please enter judge address');
            return;
        }

        const success = await this.roleManager.addJudge(address);
        if (success) {
            document.getElementById('judge-address').value = '';
            this.displayJudgesList();

            // Если добавленный судья - текущий пользователь, обновляем роль
            if (address.toLowerCase() === this.auth.currentAccount.toLowerCase()) {
                await this.auth.loadUserProfile();
            }
        }
    }

    async removeJudge(address) {
        const success = await this.roleManager.removeJudge(address);
        if (success) {
            this.displayJudgesList();
        }
    }

    async addAdmin() {
        const address = document.getElementById('admin-address').value.trim();
        if (!address) {
            this.auth.showError('Please enter admin address');
            return;
        }

        const success = await this.roleManager.addAdmin(address);
        if (success) {
            document.getElementById('admin-address').value = '';
            this.displayAdminsList();
        }
    }

    async removeAdmin(address) {
        // Не позволяем удалить самого себя
        if (address.toLowerCase() === this.auth.currentAccount.toLowerCase()) {
            this.auth.showError('You cannot remove yourself as admin');
            return;
        }

        const success = await this.roleManager.removeAdmin(address);
        if (success) {
            this.displayAdminsList();
        }
    }

    get web3() {
        return this.auth.web3;
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


let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MultiPartyApp();
});