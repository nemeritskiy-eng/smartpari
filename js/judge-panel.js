// js/judge-panel.js
class JudgePanel {
    constructor(app) {
        this.app = app;
        this.auth = app.auth;
        this.contract = app.contract;
        this.roundsManager = app.roundsManager;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('judge-distribute').addEventListener('click', () => {
            this.handleDistributeRound();
        });

        document.getElementById('judge-refresh').addEventListener('click', () => {
            this.refreshJudgeData();
        });
    }

    async handleDistributeRound() {
        const roundId = document.getElementById('judge-round-id').value;

        if (!roundId) {
            this.auth.showError('Please enter round ID');
            return;
        }

        const round = this.roundsManager.getRoundById(roundId);
        if (!round) {
            this.auth.showError('Round not found');
            return;
        }

        if (round.userC.toLowerCase() !== this.auth.currentAccount.toLowerCase()) {
            this.auth.showError('You are not the judge for this round');
            return;
        }

        const success = await this.contract.distributeRound(roundId);
        if (success) {
            document.getElementById('judge-round-id').value = '';
            await this.roundsManager.refreshRound(roundId);
            this.displayJudgeRounds();
        }
    }

    async refreshJudgeData() {
        this.auth.showInfo('Refreshing judge data...');
        await this.roundsManager.loadAllRounds();
        this.displayJudgeRounds();
        this.displayJudgeHistory();
        this.auth.showSuccess('Judge data refreshed!');
    }

    displayJudgeRounds() {
        const activeContainer = document.getElementById('judge-active-rounds');
        const rounds = this.getJudgeRounds();

        if (rounds.length === 0) {
            activeContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Active Rounds</h3>
                    <p>You are not assigned to any active rounds.</p>
                </div>
            `;
            return;
        }

        const activeRounds = rounds.filter(round => !round.completed && !round.refunded);
        const completedRounds = rounds.filter(round => round.completed || round.refunded);

        activeContainer.innerHTML = activeRounds.map(round => this.createJudgeRoundCard(round)).join('');

        // Сохраняем завершенные раунды для истории
        this.completedRounds = completedRounds;
    }

    displayJudgeHistory() {
        const historyContainer = document.getElementById('judge-history');
        if (!this.completedRounds || this.completedRounds.length === 0) {
            historyContainer.innerHTML = '<p>No decision history yet.</p>';
            return;
        }

        const historyHTML = this.completedRounds.map(round => `
            <div class="history-item">
                <div class="history-header">
                    <strong>Round #${round.id}</strong>
                    <span class="history-date">${new Date(round.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="history-details">
                    <span>Users: ${round.formatted.userA} vs ${round.formatted.userB}</span>
                    <span class="history-status">${round.formatted.status}</span>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    getJudgeRounds() {
        if (!this.auth.currentAccount) return [];

        const judgeAddress = this.auth.currentAccount.toLowerCase();
        const judgeRounds = [];

        for (const round of this.roundsManager.roundsCache.values()) {
            if (round.userC.toLowerCase() === judgeAddress) {
                judgeRounds.push(round);
            }
        }

        return judgeRounds;
    }

    createJudgeRoundCard(round) {
        const canDistribute = round.deposits.depositedA && round.deposits.depositedB && round.deposits.depositedC;

        return `
            <div class="judge-round-card">
                <div class="round-header">
                    <h4>Round #${round.id}</h4>
                    <div class="round-meta">
                        <span class="deposit-status ${canDistribute ? 'ready' : 'pending'}">
                            ${canDistribute ? 'Ready to Distribute' : 'Waiting for Deposits'}
                        </span>
                    </div>
                </div>

                <div class="participants-info">
                    <div class="participant">
                        <strong>User A:</strong> ${round.formatted.userA}
                        <span class="deposit-indicator ${round.deposits.depositedA ? 'deposited' : 'pending'}">
                            ${round.deposits.depositedA ? '✅' : '⏳'}
                        </span>
                    </div>
                    <div class="participant">
                        <strong>User B:</strong> ${round.formatted.userB}
                        <span class="deposit-indicator ${round.deposits.depositedB ? 'deposited' : 'pending'}">
                            ${round.deposits.depositedB ? '✅' : '⏳'}
                        </span>
                    </div>
                    <div class="participant">
                        <strong>Judge (You):</strong> ${round.formatted.userC}
                        <span class="deposit-indicator ${round.deposits.depositedC ? 'deposited' : 'pending'}">
                            ${round.deposits.depositedC ? '✅' : '⏳'}
                        </span>
                    </div>
                </div>

                <div class="amounts-summary">
                    <div class="total-amount">
                        Total in Round: <strong>${(parseFloat(round.formatted.amountA) + parseFloat(round.formatted.amountB) + parseFloat(round.formatted.amountC)).toFixed(3)} BNB</strong>
                    </div>
                </div>

                ${canDistribute ? `
                    <div class="judge-actions">
                        <button class="btn-success" onclick="app.judgePanel.distributeRound(${round.id})">
                            🎯 Distribute Funds
                        </button>
                        <button class="btn-secondary" onclick="app.judgePanel.viewRoundDetails(${round.id})">
                            📊 View Details
                        </button>
                    </div>
                ` : `
                    <div class="waiting-message">
                        ⏳ Waiting for all participants to deposit...
                    </div>
                `}
            </div>
        `;
    }

    async distributeRound(roundId) {
        const success = await this.contract.distributeRound(roundId);
        if (success) {
            await this.roundsManager.refreshRound(roundId);
            this.displayJudgeRounds();
            this.displayJudgeHistory();
        }
    }

    viewRoundDetails(roundId) {
        const round = this.roundsManager.getRoundById(roundId);
        if (!round) return;

        // Показать детальную информацию о раунде
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal large">
                <h3>Round #${roundId} Details</h3>
                <div class="round-details-grid">
                    <div class="detail-section">
                        <h4>Participants</h4>
                        <p><strong>User A:</strong> ${round.formatted.userA}</p>
                        <p><strong>User B:</strong> ${round.formatted.userB}</p>
                        <p><strong>Judge:</strong> ${round.formatted.userC} (You)</p>
                    </div>
                    <div class="detail-section">
                        <h4>Deposits</h4>
                        <p>User A: ${round.formatted.amountA} BNB ${round.formatted.deposits.A}</p>
                        <p>User B: ${round.formatted.amountB} BNB ${round.formatted.deposits.B}</p>
                        <p>Judge: ${round.formatted.amountC} BNB ${round.formatted.deposits.C}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Status</h4>
                        <p>Round Status: ${round.formatted.status}</p>
                        <p>Total Value: ${(parseFloat(round.formatted.amountA) + parseFloat(round.formatted.amountB) + parseFloat(round.formatted.amountC)).toFixed(3)} BNB</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
}