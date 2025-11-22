// js/rounds-manager.js
class RoundsManager {
    constructor(authManager, contractManager) {
        this.auth = authManager;
        this.contract = contractManager;
        this.roundsCache = new Map();
        this.userRounds = new Map();

        this.init();
    }

    async init() {
        await this.loadAllRounds();
        this.setupAutoRefresh();
    }

    async loadAllRounds() {
        try {
            if (!this.contract.contract) {
                console.warn('Contract not loaded, skipping rounds load');
                return;
            }

            const roundCounter = await this.contract.contract.methods.roundCounter().call();
            console.log(`📊 Loading ${roundCounter} rounds...`);

            for (let i = 1; i <= roundCounter; i++) {
                await this.loadRoundDetails(i);
            }

            this.updateUserSpecificRounds();
            console.log('✅ All rounds loaded');

        } catch (error) {
            console.error('Error loading rounds:', error);
        }
    }

    async loadRoundDetails(roundId) {
        try {
            const status = await this.contract.getRoundStatus(roundId);
            const deposits = await this.contract.getRoundDeposits(roundId);

            const roundData = {
                id: roundId,
                ...status,
                deposits,
                timestamp: Date.now(),
                formatted: this.formatRoundData(status, deposits)
            };

            this.roundsCache.set(roundId, roundData);
            return roundData;

        } catch (error) {
            console.error(`Error loading round ${roundId}:`, error);
            return null;
        }
    }

    formatRoundData(status, deposits) {
        return {
            userA: this.auth.formatAddress(status.userA),
            userB: this.auth.formatAddress(status.userB),
            userC: this.auth.formatAddress(status.userC),
            amountA: this.web3.utils.fromWei(status.amountA, 'ether'),
            amountB: this.web3.utils.fromWei(status.amountB, 'ether'),
            amountC: this.web3.utils.fromWei(status.amountC, 'ether'),
            status: status.completed ? 'Completed' : status.refunded ? 'Refunded' : 'Active',
            deposits: {
                A: deposits.depositedA ? '✅' : '❌',
                B: deposits.depositedB ? '✅' : '❌',
                C: deposits.depositedC ? '✅' : '❌'
            }
        };
    }

    updateUserSpecificRounds() {
        if (!this.auth.currentAccount) return;

        const userAddress = this.auth.currentAccount.toLowerCase();
        const userRounds = [];

        for (const [roundId, round] of this.roundsCache) {
            if (round.userA.toLowerCase() === userAddress ||
                round.userB.toLowerCase() === userAddress ||
                round.userC.toLowerCase() === userAddress) {
                userRounds.push(round);
            }
        }

        this.userRounds.set(userAddress, userRounds);
        console.log(`📋 Found ${userRounds.length} rounds for user`);
    }

    getUserRounds() {
        if (!this.auth.currentAccount) return [];
        return this.userRounds.get(this.auth.currentAccount.toLowerCase()) || [];
    }

    getActiveRounds() {
        const active = [];
        for (const round of this.roundsCache.values()) {
            if (!round.completed && !round.refunded) {
                active.push(round);
            }
        }
        return active;
    }

    getRoundById(roundId) {
        return this.roundsCache.get(parseInt(roundId));
    }

    async refreshRound(roundId) {
        console.log(`🔄 Refreshing round ${roundId}`);
        return await this.loadRoundDetails(roundId);
    }

    setupAutoRefresh() {
        // Автообновление каждые 30 секунд
        setInterval(() => {
            if (this.auth.currentAccount) {
                this.loadAllRounds();
            }
        }, 30000);
    }

    // Статистика платформы
    getPlatformStats() {
        let totalRounds = this.roundsCache.size;
        let activeRounds = 0;
        let totalValue = 0;
        let completedRounds = 0;

        for (const round of this.roundsCache.values()) {
            if (!round.completed && !round.refunded) activeRounds++;
            if (round.completed) completedRounds++;

            totalValue += parseFloat(round.formatted.amountA);
            totalValue += parseFloat(round.formatted.amountB);
            totalValue += parseFloat(round.formatted.amountC);
        }

        return {
            totalRounds,
            activeRounds,
            completedRounds,
            totalValue: totalValue.toFixed(2)
        };
    }

    get web3() {
        return this.auth.web3;
    }
}