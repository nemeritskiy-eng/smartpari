// Глобальные переменные
let web3;
let currentAccount;
let currentContractAddress = null;

// Элементы интерфейса
const connectWalletBtn = document.getElementById('connect-wallet');
const walletInfoDiv = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');

const useContractBtn = document.getElementById('use-contract-btn');
const deployContractBtn = document.getElementById('deploy-contract-btn');
const contractAddressInput = document.getElementById('contract-address');
const currentContractDiv = document.getElementById('current-contract');
const deployStatusDiv = document.getElementById('deploy-status');

const startRoundBtn = document.getElementById('start-round-btn');
const userAInput = document.getElementById('userA');
const userBInput = document.getElementById('userB');

const makeDepositBtn = document.getElementById('make-deposit-btn');
const roundIdInput = document.getElementById('round-id');
const depositAmountInput = document.getElementById('deposit-amount');

const checkRoundBtn = document.getElementById('check-round-btn');
const checkRoundIdInput = document.getElementById('check-round-id');
const roundDetailsDiv = document.getElementById('round-details');

// Инициализация при загрузке
window.addEventListener('load', async () => {
    // Проверяем, установлен ли Web3 провайдер (MetaMask)
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);

        // Проверяем, есть ли сохраненный адрес контракта
        const savedAddress = localStorage.getItem('contractAddress');
        if (savedAddress) {
            currentContractAddress = savedAddress;
            currentContractDiv.innerText = `Current contract: ${savedAddress}`;
            contractAddressInput.value = savedAddress;
        }

        // Проверяем, подключены ли уже аккаунты
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            updateWalletInfo();
        }
    } else {
        alert('Please install MetaMask to use this DApp.');
    }
});

// Подключение кошелька
connectWalletBtn.addEventListener('click', async () => {
    if (!web3) {
        alert('Web3 not initialized. Please refresh the page.');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        updateWalletInfo();
    } catch (error) {
        console.error('Error connecting wallet:', error);
    }
});

function updateWalletInfo() {
    walletAddressSpan.textContent = currentAccount;
    walletInfoDiv.style.display = 'block';
    connectWalletBtn.style.display = 'none';
}

// Использование существующего контракта
useContractBtn.addEventListener('click', () => {
    const address = contractAddressInput.value.trim();
    if (web3.utils.isAddress(address)) {
        currentContractAddress = address;
        currentContractDiv.innerText = `Current contract: ${address}`;
        localStorage.setItem('contractAddress', address);
    } else {
        alert('Invalid contract address');
    }
});

// Деплой нового контракта
deployContractBtn.addEventListener('click', async () => {
    if (!currentAccount) {
        alert('Please connect wallet first');
        return;
    }

    deployStatusDiv.innerHTML = 'Deploying...';

    try {
        const contract = new web3.eth.Contract(contractABI);
        const deployTx = contract.deploy({
            data: contractBytecode
        });

        const gasEstimate = await deployTx.estimateGas({ from: currentAccount });
        const gasPrice = await web3.eth.getGasPrice();

        const deployedContract = await deployTx.send({
            from: currentAccount,
            gas: gasEstimate,
            gasPrice: gasPrice
        });

        currentContractAddress = deployedContract.options.address;
        currentContractDiv.innerText = `Current contract: ${currentContractAddress}`;
        contractAddressInput.value = currentContractAddress;
        localStorage.setItem('contractAddress', currentContractAddress);

        deployStatusDiv.innerHTML = `Contract deployed at: ${currentContractAddress}`;
    } catch (error) {
        console.error('Deployment error:', error);
        deployStatusDiv.innerHTML = `Deployment failed: ${error.message}`;
    }
});

// Запуск раунда
startRoundBtn.addEventListener('click', async () => {
    if (!currentContractAddress) {
        alert('Please set contract address first');
        return;
    }

    if (!currentAccount) {
        alert('Please connect wallet first');
        return;
    }

    const userA = userAInput.value.trim();
    const userB = userBInput.value.trim();

    if (!web3.utils.isAddress(userA) || !web3.utils.isAddress(userB)) {
        alert('Invalid addresses');
        return;
    }

    try {
        const contract = new web3.eth.Contract(contractABI, currentContractAddress);
        const result = await contract.methods.startRound(userA, userB).send({
            from: currentAccount
        });

        alert(`Round started! Round ID: ${result.events.RoundStarted.returnValues.roundId}`);
    } catch (error) {
        console.error('Error starting round:', error);
        alert('Error starting round: ' + error.message);
    }
});

// Депозит
makeDepositBtn.addEventListener('click', async () => {
    if (!currentContractAddress) {
        alert('Please set contract address first');
        return;
    }

    if (!currentAccount) {
        alert('Please connect wallet first');
        return;
    }

    const roundId = roundIdInput.value;
    const amountETH = depositAmountInput.value;

    if (!roundId || !amountETH) {
        alert('Please enter round ID and amount');
        return;
    }

    try {
        const amountWei = web3.utils.toWei(amountETH, 'ether');
        const contract = new web3.eth.Contract(contractABI, currentContractAddress);

        const result = await contract.methods.deposit(roundId).send({
            from: currentAccount,
            value: amountWei
        });

        alert('Deposit successful!');
    } catch (error) {
        console.error('Error making deposit:', error);
        alert('Error making deposit: ' + error.message);
    }
});

// Проверка раунда
checkRoundBtn.addEventListener('click', async () => {
    if (!currentContractAddress) {
        alert('Please set contract address first');
        return;
    }

    const roundId = checkRoundIdInput.value;
    if (!roundId) {
        alert('Please enter round ID');
        return;
    }

    try {
        const contract = new web3.eth.Contract(contractABI, currentContractAddress);
        const status = await contract.methods.getRoundStatus(roundId).call();
        const deposits = await contract.methods.getRoundDeposits(roundId).call();

        const details = `
            <p><strong>User A:</strong> ${status.userA}</p>
            <p><strong>User B:</strong> ${status.userB}</p>
            <p><strong>User C:</strong> ${status.userC}</p>
            <p><strong>Amount A:</strong> ${web3.utils.fromWei(status.amountA, 'ether')} ETH</p>
            <p><strong>Amount B:</strong> ${web3.utils.fromWei(status.amountB, 'ether')} ETH</p>
            <p><strong>Amount C:</strong> ${web3.utils.fromWei(status.amountC, 'ether')} ETH</p>
            <p><strong>Deposited A:</strong> ${deposits.depositedA ? 'Yes' : 'No'}</p>
            <p><strong>Deposited B:</strong> ${deposits.depositedB ? 'Yes' : 'No'}</p>
            <p><strong>Deposited C:</strong> ${deposits.depositedC ? 'Yes' : 'No'}</p>
            <p><strong>Completed:</strong> ${status.completed ? 'Yes' : 'No'}</p>
            <p><strong>Refunded:</strong> ${status.refunded ? 'Yes' : 'No'}</p>
        `;

        roundDetailsDiv.innerHTML = details;
    } catch (error) {
        console.error('Error checking round:', error);
        alert('Error checking round: ' + error.message);
    }
});