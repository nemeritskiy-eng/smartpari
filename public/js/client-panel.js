// js/client-panel.js
class ClientPanel {
    constructor(app) {
        this.app = app;
        this.auth = app.auth;
        this.contract = app.contract;
        this.roundsManager = app.roundsManager;

        this.setupEventListeners();
    }

    setupEventListeners() {

        // Депозит
        document.getElementById('client-make-deposit').addEventListener('click', () => {
            this.handleMakeDeposit();
        });

        // Обновление списка раундов
        document.getElementById('client-refresh-rounds').addEventListener('click', () => {
            this.refreshRounds();
        });
    }

    async handleMakeDeposit() {
        const roundId = document.getElementById('client-round-id').value;
        const amount = document.getElementById('client-deposit-amount').value;

        if (!this.validateDeposit(roundId, amount)) return;

        const success = await this.contract.makeDeposit(roundId, amount);
        if (success) {
            this.clearForm('client-deposit-form');
            await this.roundsManager.refreshRound(roundId);
            this.displayClientRounds();
        }
    }

    validateAddresses(userA, userB) {
        if (!this.web3.utils.isAddress(userA) || !this.web3.utils.isAddress(userB)) {
            this.auth.showError('Please enter valid Ethereum addresses');
            return false;
        }

        if (userA.toLowerCase() === userB.toLowerCase()) {
            this.auth.showError('User A and User B must be different addresses');
            return false;
        }

        return true;
    }

    validateDeposit(roundId, amount) {
        if (!roundId || !amount) {
            this.auth.showError('Please enter round ID and amount');
            return false;
        }

        if (parseFloat(amount) <= 0) {
            this.auth.showError('Amount must be greater than 0');
            return false;
        }

        return true;
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    async refreshRounds() {
        this.auth.showInfo('Refreshing rounds...');
        await this.roundsManager.loadAllRounds();
        this.displayClientRounds();
        this.auth.showSuccess('Rounds refreshed!');
    }

    displayClientRounds() {
        const container = document.getElementById('client-rounds-list');
        const rounds = this.roundsManager.getUserRounds();

        if (rounds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Rounds Found</h3>
                    <p>You haven't participated in any rounds yet.</p>
                    <button class="btn-secondary" onclick="app.showPage('home')">
                        Create Your First Round
                    </button>
                </div>
            `;
            return;
        }

        const roundsHTML = rounds.map(round => this.createRoundCard(round)).join('');
        container.innerHTML = roundsHTML;
    }

    createRoundCard(round) {
        const isUserA = round.userA.toLowerCase() === this.auth.currentAccount.toLowerCase();
        const isUserB = round.userB.toLowerCase() === this.auth.currentAccount.toLowerCase();
        const isJudge = round.userC.toLowerCase() === this.auth.currentAccount.toLowerCase();

        const userRole = isUserA ? 'User A' : isUserB ? 'User B' : isJudge ? 'Judge' : 'Participant';

        return `
            <div class="round-card ${round.completed ? 'completed' : 'active'}">
                <div class="round-header">
                    <div class="round-title">
                        <h4>Round #${round.id}</h4>
                        <span class="role-badge">${userRole}</span>
                    </div>
                    <div class="round-status">
                        <span class="status-badge status-${round.completed ? 'completed' : 'active'}">
                            ${round.formatted.status}
                        </span>
                    </div>
                </div>

                <div class="round-participants">
                    <div class="participant">
                        <strong>User A:</strong> ${round.formatted.userA}
                        ${isUserA ? ' (You)' : ''}
                    </div>
                    <div class="participant">
                        <strong>User B:</strong> ${round.formatted.userB}
                        ${isUserB ? ' (You)' : ''}
                    </div>
                    <div class="participant">
                        <strong>Judge:</strong> ${round.formatted.userC}
                        ${isJudge ? ' (You)' : ''}
                    </div>
                </div>

                <div class="round-amounts">
                    <div class="amount-item">
                        <span>User A:</span>
                        <strong>${round.formatted.amountA} BNB</strong>
                        <span class="deposit-status">${round.formatted.deposits.A}</span>
                    </div>
                    <div class="amount-item">
                        <span>User B:</span>
                        <strong>${round.formatted.amountB} BNB</strong>
                        <span class="deposit-status">${round.formatted.deposits.B}</span>
                    </div>
                    <div class="amount-item">
                        <span>Judge:</span>
                        <strong>${round.formatted.amountC} BNB</strong>
                        <span class="deposit-status">${round.formatted.deposits.C}</span>
                    </div>
                </div>

                ${!round.completed && !round.refunded ? this.createActionButtons(round) : ''}

                <div class="round-footer">
                    <small>Round ID: ${round.id} | Created: ${new Date(round.timestamp).toLocaleDateString()}</small>
                </div>
            </div>
        `;
    }

    createActionButtons(round) {
        const isUserA = round.userA.toLowerCase() === this.auth.currentAccount.toLowerCase();
        const isUserB = round.userB.toLowerCase() === this.auth.currentAccount.toLowerCase();
        const isJudge = round.userC.toLowerCase() === this.auth.currentAccount.toLowerCase();

        let buttons = '';

        if ((isUserA || isUserB) && !round.deposits[isUserA ? 'depositedA' : 'depositedB']) {
            buttons += `
                <button class="btn-primary btn-sm"
                        onclick="app.clientPanel.showDepositModal(${round.id}, '${isUserA ? 'A' : 'B'}')">
                    Make Deposit
                </button>
            `;
        }

        if (isJudge && round.deposits.depositedA && round.deposits.depositedB && round.deposits.depositedC) {
            buttons += `
                <button class="btn-success btn-sm"
                        onclick="app.contract.distributeRound(${round.id})">
                    Distribute Funds
                </button>
            `;
        }

        return buttons ? `<div class="round-actions">${buttons}</div>` : '';
    }

    showDepositModal(roundId, userType) {
        // Реализация модального окна для депозита
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <h3>Make Deposit for Round #${roundId}</h3>
                <p>You are making deposit as User ${userType}</p>
                <div class="form-group">
                    <label>Amount (BNB):</label>
                    <input type="number" id="modal-deposit-amount" placeholder="0.1" step="0.001" class="form-input">
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="app.clientPanel.submitDeposit(${roundId})">
                        Confirm Deposit
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async submitDeposit(roundId) {
        const amount = document.getElementById('modal-deposit-amount').value;

        if (!amount || parseFloat(amount) <= 0) {
            this.auth.showError('Please enter a valid amount');
            return;
        }

        const success = await this.contract.makeDeposit(roundId, amount);
        if (success) {
            document.querySelector('.modal-overlay').remove();
            await this.roundsManager.refreshRound(roundId);
            this.displayClientRounds();
        }
    }

    get web3() {
        return this.auth.web3;
    }
}