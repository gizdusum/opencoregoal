const state = {
  goalName: 'Build a calm USDC safety vault over 12 months',
  asset: 'USDC',
  amount: 50,
  cadence: 'weekly',
  duration: 12,
  goalPrompt:
    'Whenever my wallet is in profit, move a small share into a USDC goal vault and keep my monthly savings under budget.',
  profitMode: true,
  profitShare: 10,
  connectedWallet: null,
  connectedChainId: null,
  selectedChainId: '0x14a34'
};

const defaultSetup = {
  traderName: 'opencoregoal-trader',
  walletName: 'opencoregoal-vault',
  vaultAddress: '0x1b014cc5327806f2D470012B7F4370Ddba9cD548',
  policyId: 'opencoregoal-profit-vault-guard',
  keyName: 'opencoregoal-agent-guarded'
};

const cadenceMap = {
  weekly: { label: 'week', yearlyMultiplier: 52 / 12, progress: 38 },
  monthly: { label: 'month', yearlyMultiplier: 1, progress: 58 },
  yearly: { label: 'year', yearlyMultiplier: 1 / 12, progress: 88 }
};

const els = {
  form: document.getElementById('goalForm'),
  themeToggle: document.getElementById('themeToggle'),
  networkSelect: document.getElementById('networkSelect'),
  walletConnectButton: document.getElementById('walletConnectButton'),
  walletDisconnectButton: document.getElementById('walletDisconnectButton'),
  walletBadge: document.getElementById('walletBadge'),
  asset: document.getElementById('asset'),
  amount: document.getElementById('amount'),
  cadence: document.getElementById('cadence'),
  duration: document.getElementById('duration'),
  goalPrompt: document.getElementById('goalPrompt'),
  profitMode: document.getElementById('profitMode'),
  profitShare: document.getElementById('profitShare'),
  onchainDemoButton: document.getElementById('onchainDemoButton'),
  agentFillText: document.getElementById('agentFillText'),
  confirmationCard: document.getElementById('confirmationCard'),
  confirmationTitle: document.getElementById('confirmationTitle'),
  confirmationText: document.getElementById('confirmationText'),
  traderWalletName: document.getElementById('traderWalletName'),
  vaultWalletName: document.getElementById('vaultWalletName'),
  vaultAddress: document.getElementById('vaultAddress'),
  vaultPolicy: document.getElementById('vaultPolicy'),
  vaultKeyName: document.getElementById('vaultKeyName'),
  summaryHeadline: document.getElementById('summaryHeadline'),
  summaryText: document.getElementById('summaryText'),
  planSentence: document.getElementById('planSentence'),
  policyList: document.getElementById('policyList'),
  profitSentence: document.getElementById('profitSentence'),
  profitText: document.getElementById('profitText'),
  railProgress: document.getElementById('railProgress'),
  heroContribution: document.getElementById('heroContribution'),
  heroSafety: document.getElementById('heroSafety'),
  heroProfit: document.getElementById('heroProfit'),
  journeyPill: document.getElementById('journeyPill'),
  stageSeed: document.getElementById('stageSeed'),
  stageSprout: document.getElementById('stageSprout'),
  stageBloom: document.getElementById('stageBloom'),
  requestHeadline: document.getElementById('requestHeadline'),
  requestBody: document.getElementById('requestBody'),
  onchainHeadline: document.getElementById('onchainHeadline'),
  onchainBody: document.getElementById('onchainBody')
};

const THEME_KEY = 'opencoregoal-theme';
const BASE_SEPOLIA_HEX = '0x14a34';
const NETWORKS = {
  '0x14a34': {
    label: 'Base Sepolia',
    chainName: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    owsChainId: 'eip155:84532',
    onchainDemo: true
  },
  '0x1': {
    label: 'Ethereum',
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://ethereum-rpc.publicnode.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    owsChainId: 'eip155:1',
    onchainDemo: false
  }
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function shortenAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

function setCodeValue(element, label, fullValue = label) {
  element.textContent = label;
  element.title = fullValue;
}

function sentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function derivedMonthlyCap() {
  if (state.cadence === 'weekly') return state.amount * 4;
  if (state.cadence === 'monthly') return state.amount;
  return Math.max(Math.round(state.amount / 12), 25);
}

function estimatedTarget() {
  const cadence = cadenceMap[state.cadence];
  return Math.round(state.amount * cadence.yearlyMultiplier * state.duration);
}

function currentPayload() {
  return {
    asset: state.asset,
    amount: state.amount,
    cadence: state.cadence,
    duration: state.duration,
    goalPrompt: state.goalPrompt,
    profitMode: state.profitMode,
    profitShare: state.profitShare,
    connectedWallet: state.connectedWallet,
    connectedChainId: state.connectedChainId,
    selectedChainId: NETWORKS[state.selectedChainId]?.owsChainId || NETWORKS[BASE_SEPOLIA_HEX].owsChainId
  };
}

function buildApprovalMessage() {
  const networkLabel = NETWORKS[state.selectedChainId]?.label || 'Base Sepolia';
  return [
    'OpenCoreGoal plan approval',
    `Wallet: ${state.connectedWallet || 'not connected'}`,
    `Network: ${networkLabel}`,
    `Asset: ${state.asset}`,
    `Sweep: ${formatMoney(state.amount)} ${state.cadence}`,
    `Duration: ${state.duration} months`,
    `Profit sweep: ${state.profitMode ? `${state.profitShare}%` : 'disabled'}`,
    `Prompt: ${state.goalPrompt}`
  ].join('\n');
}

function updateRail() {
  const progress = cadenceMap[state.cadence].progress + Math.min(state.duration, 24);
  els.railProgress.style.setProperty('--progress', `${Math.min(progress, 94)}%`);
  els.heroContribution.textContent = `${formatMoney(state.amount)} ${state.cadence}`;
  els.heroSafety.textContent = 'Strict cap';
  els.heroProfit.textContent = state.profitMode ? `${state.profitShare}% of gains` : 'Manual only';
  els.journeyPill.textContent = state.cadence === 'yearly' ? 'Long horizon' : 'On track';

  [els.stageSeed, els.stageSprout, els.stageBloom].forEach((stage) => {
    stage.classList.remove('active', 'done');
  });

  els.stageSeed.classList.add('done');
  if (state.duration >= 6) els.stageSprout.classList.add('done');
  else els.stageSprout.classList.add('active');

  if (state.duration >= 12 || state.cadence === 'yearly') els.stageBloom.classList.add('active');
}

function buildSummary() {
  const target = estimatedTarget();
  const monthlyCap = derivedMonthlyCap();

  els.summaryHeadline.textContent = `${sentenceCase(state.goalName)}.`;
  els.summaryText.textContent = `Small ${state.asset} savings sweeps move into a dedicated goal vault. Estimated vault target: ${formatMoney(target)}.`;
  els.planSentence.textContent = `Move ${formatMoney(state.amount)} into a ${state.asset} goal vault every ${cadenceMap[state.cadence].label} for ${state.duration} months.`;
  els.policyList.innerHTML = [
    `Only allow ${state.asset} savings sweeps into the goal vault.`,
    `Never exceed ${formatMoney(monthlyCap)} in a calendar month.`,
    state.profitMode ? `Redirect ${state.profitShare}% of positive PNL into the goal vault.` : 'Profit sweep is disabled.'
  ].map((item) => `<li>${item}</li>`).join('');

  els.profitSentence.textContent = state.profitMode
    ? `Redirect ${state.profitShare}% of positive PNL into this goal vault.`
    : 'Keep profit redirect disabled for this plan.';
  els.profitText.textContent = state.profitMode
    ? 'Save from wins without forcing a full sale.'
    : 'Use manual sweeps only.';
}

function showConfirmation(headline, body) {
  const monthlyCap = derivedMonthlyCap();
  els.confirmationTitle.textContent = headline || `${formatMoney(state.amount)} ${state.cadence} savings vault armed.`;
  els.confirmationText.textContent =
    body ||
    `Your wallet will stay under ${formatMoney(monthlyCap)} per month and route savings into the goal vault.`;
  els.confirmationCard.hidden = false;
  els.confirmationCard.classList.remove('show');
  void els.confirmationCard.offsetWidth;
  els.confirmationCard.classList.add('show');
}

function parsePrompt(prompt) {
  const text = prompt.toLowerCase();
  const next = {};

  if (text.includes('usdt')) next.asset = 'USDT';
  else if (text.includes('dai')) next.asset = 'DAI';
  else next.asset = 'USDC';

  if (text.includes('weekly') || text.includes('every week')) next.cadence = 'weekly';
  else if (text.includes('monthly') || text.includes('every month')) next.cadence = 'monthly';
  else if (text.includes('yearly') || text.includes('every year')) next.cadence = 'yearly';

  const amountMatch = text.match(/\$?\s?(\d{2,4})/);
  if (amountMatch) next.amount = Number(amountMatch[1]);

  if (text.includes('one year') || text.includes('12 months')) next.duration = 12;
  else if (text.includes('6 months')) next.duration = 6;
  else if (text.includes('3 months')) next.duration = 3;
  else if (text.includes('24 months') || text.includes('two years')) next.duration = 24;

  if (text.includes('profit') || text.includes('pnl') || text.includes('gains')) {
    next.profitMode = true;
    const shareMatch = text.match(/(\d{1,2})\s?%/);
    if (shareMatch) next.profitShare = Number(shareMatch[1]);
  }

  next.goalName = `Build a calm ${(next.asset || state.asset)} safety vault over ${(next.duration || state.duration)} months`;
  return next;
}

function applyParsedFields(parsed) {
  Object.entries(parsed).forEach(([key, value]) => {
    if (value !== undefined && key in state) state[key] = value;
  });

  els.agentFillText.textContent = [
    state.asset,
    state.cadence,
    `${formatMoney(state.amount)} per sweep`,
    `${state.duration} months`,
    state.profitMode ? `${state.profitShare}% profit sweep` : 'manual mode'
  ].join(' • ');

  syncForm();
  buildSummary();
  updateRail();
}

function syncForm() {
  els.asset.value = state.asset;
  els.amount.value = state.amount;
  els.cadence.value = state.cadence;
  els.duration.value = String(state.duration);
  els.goalPrompt.value = state.goalPrompt;
  els.profitMode.checked = state.profitMode;
  els.profitShare.value = String(state.profitShare);
  els.networkSelect.value = state.selectedChainId;
  renderWalletBadge();
}

function renderWalletBadge() {
  if (!state.connectedWallet) {
    els.walletBadge.hidden = true;
    els.walletDisconnectButton.hidden = true;
    els.walletConnectButton.textContent = 'Connect wallet';
    setCodeValue(els.traderWalletName, 'Not connected', 'No user wallet connected');
    return;
  }

  els.walletBadge.hidden = false;
  els.walletDisconnectButton.hidden = false;
  const networkLabel = NETWORKS[state.connectedChainId]?.label || NETWORKS[state.selectedChainId]?.label || 'Wallet linked';
  els.walletBadge.textContent = `${shortenAddress(state.connectedWallet)} • ${networkLabel}`;
  els.walletConnectButton.textContent = 'Wallet connected';
  setCodeValue(
    els.traderWalletName,
    shortenAddress(state.connectedWallet),
    `${state.connectedWallet} on ${networkLabel}`
  );
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('theme-dark', dark);
  els.themeToggle.textContent = dark ? 'Light' : 'Dark';
}

function loadTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
}

function applyFormState(formData) {
  state.asset = formData.get('asset');
  state.amount = Number(formData.get('amount')) || state.amount;
  state.cadence = formData.get('cadence');
  state.duration = Number(formData.get('duration')) || state.duration;
  state.goalPrompt = formData.get('goalPrompt').trim() || state.goalPrompt;
  state.profitMode = formData.get('profitMode') === 'on';
  state.profitShare = Number(formData.get('profitShare')) || state.profitShare;
  state.goalName = `Build a calm ${state.asset} safety vault over ${state.duration} months`;
}

async function loadOwsStatus() {
  try {
    const response = await fetch('/api/ows/status');
    if (!response.ok) return;
    const data = await response.json();
    setCodeValue(els.vaultWalletName, 'Goal vault', data.wallets.vault.name);
    setCodeValue(els.vaultAddress, shortenAddress(data.wallets.vault.address), data.wallets.vault.address);
    setCodeValue(els.vaultPolicy, 'Profit Vault Guard', data.policy.id);
    setCodeValue(els.vaultKeyName, 'Guarded agent key', defaultSetup.keyName);
    renderWalletBadge();
  } catch (error) {
    els.requestHeadline.textContent = 'Backend not connected yet.';
    els.requestBody.textContent = 'Open the app through the Node server to enable live OWS requests.';
  }
}

async function ensureBaseSepolia() {
  if (!window.ethereum) return;

  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
  state.connectedChainId = currentChainId;
  if (currentChainId === state.selectedChainId) return;

  const target = NETWORKS[state.selectedChainId];

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: state.selectedChainId }]
    });
    state.connectedChainId = state.selectedChainId;
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: state.selectedChainId,
          chainName: target.chainName,
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          rpcUrls: target.rpcUrls,
          blockExplorerUrls: target.blockExplorerUrls
        }]
      });
      state.connectedChainId = state.selectedChainId;
      return;
    }
    throw error;
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    showConfirmation('No wallet found.', 'Install a browser wallet like MetaMask to connect your own address.');
    return;
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  state.connectedWallet = accounts?.[0] || null;
  await ensureBaseSepolia();
  renderWalletBadge();

  if (state.connectedWallet) {
    showConfirmation('Wallet connected.', `Connected ${shortenAddress(state.connectedWallet)} for the user-facing flow. OWS vault execution remains protected in the background.`);
  }
}

function bindWalletEvents() {
  if (!window.ethereum?.on) return;

  window.ethereum.on('accountsChanged', (accounts) => {
    state.connectedWallet = accounts?.[0] || null;
    renderWalletBadge();
  });

  window.ethereum.on('chainChanged', (chainId) => {
    state.connectedChainId = chainId;
    renderWalletBadge();
  });
}

async function createLiveRequest() {
  if (!state.connectedWallet) {
    const message = 'Connect your wallet first to approve this savings plan.';
    els.requestHeadline.textContent = 'Wallet approval needed.';
    els.requestBody.textContent = message;
    showConfirmation('Connect your wallet first.', message);
    return;
  }

  els.requestHeadline.textContent = 'Waiting for wallet approval...';
  els.requestBody.textContent = 'Please sign the plan approval message in your wallet.';

  try {
    await window.ethereum.request({
      method: 'personal_sign',
      params: [buildApprovalMessage(), state.connectedWallet]
    });
  } catch (error) {
    const message = error?.code === 4001 ? 'Wallet signature was rejected.' : (error.message || 'Wallet approval failed.');
    els.requestHeadline.textContent = 'Wallet approval was not completed.';
    els.requestBody.textContent = message;
    showConfirmation('Plan approval cancelled.', message);
    return;
  }

  els.requestHeadline.textContent = 'Creating live OWS request...';
  els.requestBody.textContent = 'Wallet approved. Checking policy and asking OWS to sign the plan.';

  const response = await fetch('/api/ows/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentPayload())
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    els.requestHeadline.textContent = 'Request blocked by policy.';
    els.requestBody.textContent = data.policy?.reason || data.error || 'The current plan did not pass the OWS policy.';
    showConfirmation('Policy blocked this plan.', els.requestBody.textContent);
    return;
  }

  const signature = data.request.signature;
  const shortSignature = `${signature.slice(0, 14)}...${signature.slice(-8)}`;
  els.requestHeadline.textContent = 'Signed request created.';
  els.requestBody.textContent = `Wallet approved and OWS signed the live request. Signature: ${shortSignature}`;
  showConfirmation('Live OWS request ready.', `Your wallet approved the plan and ${data.policy.reason.toLowerCase()}`);
}

async function runOnchainDemo() {
  if (!NETWORKS[state.selectedChainId]?.onchainDemo) {
    const message = 'The live onchain demo currently runs on Base Sepolia. Switch the network selector back to Base Sepolia to use it.';
    els.onchainHeadline.textContent = 'Network not supported for demo.';
    els.onchainBody.textContent = message;
    showConfirmation('Switch to Base Sepolia.', message);
    return;
  }

  els.onchainHeadline.textContent = 'Preparing live transfer...';
  els.onchainBody.textContent = 'Building an onchain demo transfer from the trader wallet to the goal vault.';

  const response = await fetch('/api/ows/onchain-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentPayload())
  });

  const data = await response.json();

  if (data.ok && data.execution?.txHash) {
    const hash = data.execution.txHash;
    els.onchainHeadline.textContent = 'Live transfer broadcast.';
    els.onchainBody.textContent = `${data.execution.chain} tx hash: ${shortenAddress(hash)}`;
    showConfirmation('Onchain demo sent.', `The trader wallet broadcast a live transfer into the goal vault on ${data.execution.chain}.`);
    return;
  }

  const note = data.execution?.note || data.execution?.error || data.error || 'The transfer could not be broadcast.';
  els.onchainHeadline.textContent = 'Transfer path is ready.';
  els.onchainBody.textContent = note;
  showConfirmation('Onchain demo prepared.', note);
}

function render() {
  syncForm();
  buildSummary();
  updateRail();
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  applyFormState(new FormData(els.form));
  render();
  try {
    await createLiveRequest();
  } catch (error) {
    els.requestHeadline.textContent = 'Live request failed.';
    els.requestBody.textContent = error.message;
    showConfirmation('Live request failed.', error.message);
  }
});

els.goalPrompt.addEventListener('input', () => {
  const prompt = els.goalPrompt.value.trim();
  if (!prompt) {
    els.agentFillText.textContent = 'Waiting for your prompt.';
    return;
  }
  state.goalPrompt = prompt;
  applyParsedFields(parsePrompt(prompt));
});

els.onchainDemoButton.addEventListener('click', async () => {
  applyFormState(new FormData(els.form));
  render();
  try {
    await runOnchainDemo();
  } catch (error) {
    els.onchainHeadline.textContent = 'Onchain demo failed.';
    els.onchainBody.textContent = error.message;
    showConfirmation('Onchain demo failed.', error.message);
  }
});

  els.walletConnectButton.addEventListener('click', async () => {
  try {
    await connectWallet();
  } catch (error) {
    showConfirmation('Wallet connection failed.', error.message);
  }
});

els.walletDisconnectButton.addEventListener('click', () => {
  state.connectedWallet = null;
  state.connectedChainId = null;
  renderWalletBadge();
  showConfirmation('Wallet disconnected.', 'The UI wallet connection has been cleared from this session.');
});

els.networkSelect.addEventListener('change', async () => {
  state.selectedChainId = els.networkSelect.value;
  renderWalletBadge();

  if (state.connectedWallet && window.ethereum) {
    try {
      await ensureBaseSepolia();
      renderWalletBadge();
    } catch (error) {
      showConfirmation('Network switch failed.', error.message);
    }
  }
});

els.themeToggle.addEventListener('click', () => {
  const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

loadTheme();
render();
loadOwsStatus();
bindWalletEvents();
