class AuthManager {
    constructor() {
        this.web3 = null;
        this.currentAccount = null;
        this.currentRole = CONFIG.ROLES.CLIENT;
        this.userProfile = null;
        this.contract = null;

        this.init();
    }

    async init() {
        await this.initWeb3();
        await this.checkConnection();
        this.setupEventListeners();
    }

    async initWeb3() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            console.log('✅ Web3 initialized');
        } else {
            this.showError('Please install MetaMask to use this application');
            return false;
        }
        return true;
    }

    async checkConnection() {
        try {
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                await this.loadUserProfile();
                this.updateUI();
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }
    }

    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.currentAccount = accounts[0];
            await this.loadUserProfile();
            this.updateUI();

            this.showSuccess('Wallet connected successfully!');
            return true;

        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showError('Failed to connect wallet: ' + error.message);
            return false;
        }
    }

    async loadUserProfile() {
        if (!this.currentAccount) return;

        try {
            // Здесь можно добавить логику определения роли пользователя
            // Например, проверка в контракте или базе данных
            const chainId = await this.web3.eth.getChainId();
            const chainHex = '0x' + chainId.toString(16);

            // Временная логика - в реальном приложении нужно проверять роль в контракте
            if (this.currentAccount.toLowerCase() === '0xAdminAddressHere'.toLowerCase()) {
                this.currentRole = CONFIG.ROLES.ADMIN;
            } else if (this.currentAccount.toLowerCase() === '0xJudgeAddressHere'.toLowerCase()) {
                this.currentRole = CONFIG.ROLES.JUDGE;
            } else {
                this.currentRole = CONFIG.ROLES.CLIENT;
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
    }

    setupEventListeners() {
        // Слушаем смену аккаунтов
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.handleDisconnect();
                } else {
                    this.currentAccount = accounts[0];
                    this.loadUserProfile().then(() => this.updateUI());
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload();
            });
        }

        // Кнопка подключения кошелька
        document.getElementById('connect-wallet').addEventListener('click', () => {
            this.connectWallet();
        });
    }

    handleDisconnect() {
        this.currentAccount = null;
        this.currentRole = CONFIG.ROLES.CLIENT;
        this.userProfile = null;
        this.updateUI();
        this.showInfo('Wallet disconnected');
    }

    updateUI() {
        const walletInfo = document.getElementById('wallet-info');
        const connectBtn = document.getElementById('connect-wallet');

        if (this.currentAccount) {
            // Показываем информацию о кошельке
            walletInfo.innerHTML = `
                <span class="address-badge">${this.formatAddress(this.currentAccount)}</span>
                <span class="role-badge">${this.currentRole.toUpperCase()}</span>
            `;
            walletInfo.style.display = 'flex';
            connectBtn.textContent = 'Disconnect';
            connectBtn.classList.add('btn-danger');
            connectBtn.classList.remove('btn-primary');

            // Обновляем навигацию в зависимости от роли
            this.updateNavigation();

        } else {
            walletInfo.style.display = 'none';
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.classList.remove('btn-danger');
            connectBtn.classList.add('btn-primary');
        }
    }

    updateNavigation() {
        // Скрываем все специализированные ссылки
        document.querySelectorAll('.client-only, .judge-only, .admin-only').forEach(el => {
            el.style.display = 'none';
        });

        // Показываем ссылки в зависимости от роли
        switch (this.currentRole) {
            case CONFIG.ROLES.CLIENT:
                document.querySelectorAll('.client-only').forEach(el => {
                    el.style.display = 'block';
                });
                break;
            case CONFIG.ROLES.JUDGE:
                document.querySelectorAll('.judge-only').forEach(el => {
                    el.style.display = 'block';
                });
                break;
            case CONFIG.ROLES.ADMIN:
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'block';
                });
                break;
        }
    }

    formatAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(38);
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'info') {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            padding: 1rem;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // Автоматически удаляем через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Проверка прав доступа
    hasRole(requiredRole) {
        if (!this.currentAccount) return false;
        return this.currentRole === requiredRole;
    }

    requireRole(requiredRole) {
        if (!this.hasRole(requiredRole)) {
            this.showError(`This action requires ${requiredRole} role`);
            return false;
        }
        return true;
    }
}