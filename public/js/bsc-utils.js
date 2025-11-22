// bsc-utils.js
class BSCUtils {
    static getBSCFaucetLinks() {
        return {
            testnet: 'https://testnet.binance.org/faucet-smart',
            mainnetBridge: 'https://www.binance.org/en/bridge'
        };
    }

    static showBSCInstructions() {
        return `
            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4>🟡 Getting Started with BSC</h4>
                <p><strong>To use BNB Smart Chain:</strong></p>
                <ol>
                    <li>Get BNB from <a href="https://binance.com" target="_blank">Binance</a></li>
                    <li>Send BNB to your MetaMask address</li>
                    <li>Or use the <a href="https://testnet.binance.org/faucet-smart" target="_blank">Faucet</a> for testnet BNB</li>
                </ol>
                <p><small>BNB is required for transaction fees on BSC</small></p>
            </div>
        `;
    }

    static async getBSCGasPrice() {
        // BSC имеет свой API для цены газа
        try {
            const response = await fetch('https://api.bscscan.com/api?module=gastracker&action=gasoracle');
            const data = await response.json();
            return {
                safe: data.result.SafeGasPrice,
                propose: data.result.ProposeGasPrice,
                fast: data.result.FastGasPrice
            };
        } catch (error) {
            return null;
        }
    }
}