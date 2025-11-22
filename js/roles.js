// js/roles.js
class RoleManager {
    constructor(authManager, contractManager) {
        this.auth = authManager;
        this.contract = contractManager;
        this.judges = new Set();
        this.admins = new Set();

        this.loadRoleData();
    }

    async loadRoleData() {
        // Загрузка списков судей и админов из localStorage или контракта
        const savedJudges = JSON.parse(localStorage.getItem('platform_judges') || '[]');
        const savedAdmins = JSON.parse(localStorage.getItem('platform_admins') || '[]');

        this.judges = new Set(savedJudges);
        this.admins = new Set(savedAdmins);

        console.log('👥 Role data loaded:', {
            judges: Array.from(this.judges),
            admins: Array.from(this.admins)
        });
    }

    async determineUserRole(address) {
        const normalizedAddress = address.toLowerCase();

        // Проверяем админов
        if (this.admins.has(normalizedAddress)) {
            return CONFIG.ROLES.ADMIN;
        }

        // Проверяем судей
        if (this.judges.has(normalizedAddress)) {
            return CONFIG.ROLES.JUDGE;
        }

        // По умолчанию - клиент
        return CONFIG.ROLES.CLIENT;
    }

    async addJudge(judgeAddress) {
        if (!this.auth.requireRole(CONFIG.ROLES.ADMIN)) return false;

        const normalizedAddress = judgeAddress.toLowerCase();

        if (!this.web3.utils.isAddress(judgeAddress)) {
            this.auth.showError('Invalid judge address');
            return false;
        }

        this.judges.add(normalizedAddress);
        await this.saveRoleData();

        this.auth.showSuccess(`Judge added: ${this.auth.formatAddress(judgeAddress)}`);
        return true;
    }

    async removeJudge(judgeAddress) {
        if (!this.auth.requireRole(CONFIG.ROLES.ADMIN)) return false;

        const normalizedAddress = judgeAddress.toLowerCase();

        if (this.judges.has(normalizedAddress)) {
            this.judges.delete(normalizedAddress);
            await this.saveRoleData();

            this.auth.showSuccess(`Judge removed: ${this.auth.formatAddress(judgeAddress)}`);
            return true;
        }

        this.auth.showError('Judge not found');
        return false;
    }

    async addAdmin(adminAddress) {
        // Только существующие админы могут добавлять новых админов
        if (!this.auth.requireRole(CONFIG.ROLES.ADMIN)) return false;

        const normalizedAddress = adminAddress.toLowerCase();

        if (!this.web3.utils.isAddress(adminAddress)) {
            this.auth.showError('Invalid admin address');
            return false;
        }

        this.admins.add(normalizedAddress);
        await this.saveRoleData();

        this.auth.showSuccess(`Admin added: ${this.auth.formatAddress(adminAddress)}`);
        return true;
    }

    async saveRoleData() {
        localStorage.setItem('platform_judges', JSON.stringify(Array.from(this.judges)));
        localStorage.setItem('platform_admins', JSON.stringify(Array.from(this.admins)));
    }

    getJudgesList() {
        return Array.from(this.judges);
    }

    getAdminsList() {
        return Array.from(this.admins);
    }

    isJudge(address) {
        return this.judges.has(address.toLowerCase());
    }

    isAdmin(address) {
        return this.admins.has(address.toLowerCase());
    }

    get web3() {
        return this.auth.web3;
    }
}

// Обновляем AuthManager для использования RoleManager
AuthManager.prototype.loadUserProfile = async function() {
    if (!this.currentAccount) return;

    try {
        const chainId = await this.web3.eth.getChainId();
        const chainHex = '0x' + chainId.toString(16);

        // Используем RoleManager для определения роли
        if (this.app.roleManager) {
            this.currentRole = await this.app.roleManager.determineUserRole(this.currentAccount);
        } else {
            // Fallback логика
            if (this.currentAccount.toLowerCase() === '0xAdminAddressHere'.toLowerCase()) {
                this.currentRole = CONFIG.ROLES.ADMIN;
            } else if (this.currentAccount.toLowerCase() === '0xJudgeAddressHere'.toLowerCase()) {
                this.currentRole = CONFIG.ROLES.JUDGE;
            } else {
                this.currentRole = CONFIG.ROLES.CLIENT;
            }
        }

        this.userProfile = {
            address: this.currentAccount,
            role: this.currentRole,
            network: CONFIG.NETWORK_CONFIGS[chainHex]?.name || 'Unknown'
        };

        console.log('👤 User profile loaded:', this.userProfile);

    } catch (error) {
        console.error('Error loading user profile:', error);
    }
};