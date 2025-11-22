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

    // ... остальные методы остаются такими же ...

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
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MultiPartyApp();
});