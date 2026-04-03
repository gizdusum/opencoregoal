import EthereumProvider from 'https://esm.sh/@walletconnect/ethereum-provider@2.21.1';

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
  selectedChainId: '0x14a34',
  currentProvider: null,
  currentProviderType: null,
  currentProviderName: null
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
  themeToggleLabel: document.querySelector('#themeToggle .theme-toggle-label'),
  networkSelect: document.getElementById('networkSelect'),
  walletConnectButton: document.getElementById('walletConnectButton'),
  walletDisconnectButton: document.getElementById('walletDisconnectButton'),
  walletBadge: document.getElementById('walletBadge'),
  walletModal: document.getElementById('walletModal'),
  walletModalBackdrop: document.getElementById('walletModalBackdrop'),
  walletModalClose: document.getElementById('walletModalClose'),
  walletModalList: document.getElementById('walletModalList'),
  walletConnectQrButton: document.getElementById('walletConnectQrButton'),
  brandLogoImage: document.getElementById('brandLogoImage'),
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
  successToast: document.getElementById('successToast'),
  successToastTitle: document.getElementById('successToastTitle'),
  successToastText: document.getElementById('successToastText'),
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
  analyzeWalletButton: document.getElementById('analyzeWalletButton'),
  scoreValue: document.getElementById('scoreValue'),
  scoreStatus: document.getElementById('scoreStatus'),
  diagnosisSummary: document.getElementById('diagnosisSummary'),
  diagnosisPattern: document.getElementById('diagnosisPattern'),
  diagnosisChains: document.getElementById('diagnosisChains'),
  recommendedSweep: document.getElementById('recommendedSweep'),
  recommendedCap: document.getElementById('recommendedCap'),
  diagnosisTreatment: document.getElementById('diagnosisTreatment'),
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
  onchainBody: document.getElementById('onchainBody'),
  onchainLink: document.getElementById('onchainLink')
};

const THEME_KEY = 'opencoregoal-theme';
const BASE_SEPOLIA_HEX = '0x14a34';
const REOWN_PROJECT_ID = '2c7675603bcfd9904aa52c32e6ce9a34';
let toastTimer = null;
let diagnosisInFlight = false;
let walletConnectProvider = null;
let activeProviderCleanup = null;
const discoveredWallets = new Map();
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

function getActiveProvider() {
  return state.currentProvider || null;
}

function providerSupports(provider, method) {
  return Boolean(provider && typeof provider.request === 'function' && method);
}

function normalizeProviderName(name = 'Wallet') {
  return name.replace(/\s+extension$/i, '').trim();
}

function isSupportedWallet(providerDetail) {
  const provider = providerDetail?.provider;
  const name = normalizeProviderName(providerDetail?.info?.name || '');
  const supportedNames = [
    'MetaMask',
    'Rabby',
    'Phantom',
    'Coinbase Wallet',
    'Trust Wallet',
    'Brave Wallet',
    'OKX Wallet',
    'Binance Wallet',
    'Rainbow'
  ];

  if (!providerSupports(provider, 'eth_requestAccounts')) return false;
  if (
    provider?.isMetaMask ||
    provider?.isRabby ||
    provider?.isPhantom ||
    provider?.isCoinbaseWallet ||
    provider?.isTrust ||
    provider?.isBraveWallet
  ) return true;

  return supportedNames.includes(name);
}

function walletMarkContent(wallet) {
  if (wallet?.icon) {
    return `<img src="${wallet.icon}" alt="${wallet.name} icon" />`;
  }
  return normalizeProviderName(wallet?.name || 'Wallet').slice(0, 2).toUpperCase();
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

function showSuccessToast(title, body) {
  if (toastTimer) clearTimeout(toastTimer);
  els.successToastTitle.textContent = title;
  els.successToastText.textContent = body;
  els.successToast.hidden = false;
  els.successToast.classList.remove('show');
  void els.successToast.offsetWidth;
  els.successToast.classList.add('show');
  toastTimer = window.setTimeout(() => {
    els.successToast.hidden = true;
    els.successToast.classList.remove('show');
  }, 3200);
}

function resetDiagnosis() {
  els.scoreValue.textContent = '--/100';
  els.scoreStatus.textContent = 'Connect wallet';
  els.scoreStatus.className = 'diagnosis-pill';
  els.diagnosisSummary.textContent =
    'Connect a wallet to analyze your onchain behavior and estimate how well you protect gains.';
  els.diagnosisPattern.textContent = 'Not analyzed';
  els.diagnosisChains.textContent = '--';
  els.recommendedSweep.textContent = '--';
  els.recommendedCap.textContent = '--';
  els.diagnosisTreatment.textContent = 'A treatment plan will appear here after wallet analysis.';
  els.analyzeWalletButton.textContent = 'Analyze wallet';
}

function renderDiagnosis(data) {
  const diagnosis = data?.diagnosis || {};
  const recommendation = data?.recommendation || {};
  els.scoreValue.textContent = `${diagnosis.score ?? '--'}/100`;
  els.scoreStatus.textContent = diagnosis.status || 'Unknown';
  els.scoreStatus.className = `diagnosis-pill ${String(diagnosis.status || '').toLowerCase()}`;
  els.diagnosisSummary.textContent =
    diagnosis.summary || 'Wallet behavior analyzed. A protection suggestion is ready.';
  els.diagnosisPattern.textContent = diagnosis.pattern || 'Mixed';
  els.diagnosisChains.textContent = String(diagnosis.activeChains ?? '--');
  els.recommendedSweep.textContent =
    recommendation.profitSweepPct !== undefined ? `${recommendation.profitSweepPct}% of gains` : '--';
  els.recommendedCap.textContent =
    recommendation.monthlyCapUsd !== undefined ? formatMoney(recommendation.monthlyCapUsd) : '--';
  els.diagnosisTreatment.textContent =
    recommendation.treatment || 'No treatment guidance available yet.';
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
    els.walletConnectButton.hidden = false;
    els.walletConnectButton.textContent = 'Connect wallet';
    setCodeValue(els.traderWalletName, 'Not connected', 'No user wallet connected');
    return;
  }

  els.walletBadge.hidden = false;
  els.walletDisconnectButton.hidden = false;
  els.walletConnectButton.hidden = false;
  const networkLabel = NETWORKS[state.connectedChainId]?.label || NETWORKS[state.selectedChainId]?.label || 'Wallet linked';
  els.walletBadge.textContent = shortenAddress(state.connectedWallet);
  els.walletBadge.title = `${state.connectedWallet} on ${networkLabel}${state.currentProviderName ? ` via ${state.currentProviderName}` : ''}`;
  els.walletConnectButton.textContent = 'Switch wallet';
  setCodeValue(
    els.traderWalletName,
    shortenAddress(state.connectedWallet),
    `${state.connectedWallet} on ${networkLabel}${state.currentProviderName ? ` via ${state.currentProviderName}` : ''}`
  );
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('theme-dark', dark);
  if (els.themeToggleLabel) {
    els.themeToggleLabel.textContent = dark ? 'Light' : 'Dark';
  }
}

function loadTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

function openWalletModal() {
  renderWalletOptions();
  els.walletModal.hidden = false;
}

function closeWalletModal() {
  els.walletModal.hidden = true;
}

function renderWalletOptions() {
  const wallets = Array.from(discoveredWallets.values()).filter(isSupportedWallet).sort((a, b) =>
    normalizeProviderName(a.info.name).localeCompare(normalizeProviderName(b.info.name))
  );

  if (!wallets.length) {
    els.walletModalList.innerHTML = `
      <div class="wallet-modal-option">
        <span class="wallet-option-mark">--</span>
        <span class="wallet-option-copy">
          <strong>No injected wallet found</strong>
          <small>Install MetaMask, Rabby, Phantom, or use WalletConnect below.</small>
        </span>
      </div>
    `;
    return;
  }

  els.walletModalList.innerHTML = wallets.map((wallet) => `
    <button class="wallet-modal-option" type="button" data-wallet-id="${wallet.info.uuid}">
      <span class="wallet-option-mark">${walletMarkContent({ icon: wallet.info.icon, name: wallet.info.name })}</span>
      <span class="wallet-option-copy">
        <strong>${normalizeProviderName(wallet.info.name)}</strong>
        <small>Connect with the installed wallet</small>
      </span>
    </button>
  `).join('');
}

function rememberInjectedWallet(providerDetail) {
  if (!providerDetail?.info?.uuid || !providerDetail?.provider) return;
  discoveredWallets.set(providerDetail.info.uuid, providerDetail);
}

function discoverInjectedWallets() {
  if (typeof window === 'undefined') return;

  window.addEventListener('eip6963:announceProvider', (event) => {
    rememberInjectedWallet(event.detail);
    renderWalletOptions();
  });

  window.dispatchEvent(new Event('eip6963:requestProvider'));

  if (window.ethereum && discoveredWallets.size === 0) {
    const providerList = Array.isArray(window.ethereum.providers) && window.ethereum.providers.length
      ? window.ethereum.providers
      : [window.ethereum];

    providerList.forEach((provider, index) => {
      rememberInjectedWallet({
        info: {
          uuid: `fallback-window-ethereum-${index}`,
          name: provider.isRabby
            ? 'Rabby'
            : provider.isMetaMask
              ? 'MetaMask'
              : provider.isPhantom
                ? 'Phantom'
                : 'Browser Wallet',
          icon: ''
        },
        provider
      });
    });
  }
}

function attachProviderListeners(provider) {
  if (!provider?.on) return;

  if (activeProviderCleanup) activeProviderCleanup();

  const accountsChanged = (accounts) => {
    state.connectedWallet = accounts?.[0] || null;
    renderWalletBadge();
    if (!state.connectedWallet) resetDiagnosis();
  };

  const chainChanged = (chainId) => {
    state.connectedChainId = chainId;
    renderWalletBadge();
  };

  provider.on('accountsChanged', accountsChanged);
  provider.on('chainChanged', chainChanged);

  activeProviderCleanup = () => {
    if (provider.removeListener) {
      provider.removeListener('accountsChanged', accountsChanged);
      provider.removeListener('chainChanged', chainChanged);
    }
    activeProviderCleanup = null;
  };
}

async function getWalletConnectProvider() {
  if (walletConnectProvider) return walletConnectProvider;

  walletConnectProvider = await EthereumProvider.init({
    projectId: REOWN_PROJECT_ID,
    chains: [84532, 1],
    optionalChains: [84532, 1],
    showQrModal: true,
    methods: [
      'eth_requestAccounts',
      'eth_accounts',
      'personal_sign',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
      'eth_chainId'
    ],
    events: ['accountsChanged', 'chainChanged', 'disconnect'],
    metadata: {
      name: 'OpenCoreGoal',
      description: 'Goal-based auto wallet with OWS protection',
      url: 'https://opencoregoal.vercel.app',
      icons: ['https://opencoregoal.vercel.app/assets/opencoregoal-logo.png']
    }
  });

  return walletConnectProvider;
}

function makeLogoTransparent() {
  const image = els.brandLogoImage;
  if (!image) return;

  const process = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!ctx || !width || !height) return;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const frame = ctx.getImageData(0, 0, width, height);
    const { data } = frame;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);

      if (a > 0 && r > 242 && g > 242 && b > 242) {
        data[i + 3] = 0;
        continue;
      }

      if (data[i + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    ctx.putImageData(frame, 0, 0);

    if (minX >= maxX || minY >= maxY) {
      image.src = canvas.toDataURL('image/png');
      image.classList.add('is-ready');
      return;
    }

    const pad = Math.round(Math.min(width, height) * 0.04);
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(height - cropY, maxY - minY + pad * 2);

    const out = document.createElement('canvas');
    const outCtx = out.getContext('2d');
    if (!outCtx) return;
    out.width = cropW;
    out.height = cropH;
    outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    image.src = out.toDataURL('image/png');
    image.classList.add('is-ready');
  };

  if (image.complete) process();
  else {
    image.addEventListener('load', process, { once: true });
    image.addEventListener('error', () => image.classList.add('is-ready'), { once: true });
  }
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

async function ensureBaseSepolia(provider = getActiveProvider()) {
  if (!providerSupports(provider, 'eth_chainId')) return;

  const currentChainId = await provider.request({ method: 'eth_chainId' });
  state.connectedChainId = currentChainId;
  if (currentChainId === state.selectedChainId) return;

  const target = NETWORKS[state.selectedChainId];

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: state.selectedChainId }]
    });
    state.connectedChainId = state.selectedChainId;
  } catch (error) {
    if (error.code === 4902) {
      await provider.request({
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

async function connectWalletWithProvider(provider, providerName, providerType = 'injected') {
  if (!providerSupports(provider, 'eth_requestAccounts')) {
    showConfirmation('Wallet not available.', 'This wallet provider does not support the required account request flow.');
    return;
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  state.connectedWallet = accounts?.[0] || null;
  state.currentProvider = provider;
  state.currentProviderName = providerName;
  state.currentProviderType = providerType;
  let networkNotice = '';
  try {
    await ensureBaseSepolia(provider);
  } catch (error) {
    try {
      state.connectedChainId = await provider.request({ method: 'eth_chainId' });
    } catch (_ignored) {
      state.connectedChainId = null;
    }
    networkNotice = ' Wallet connected successfully. You can switch networks after connecting if your wallet does not auto-switch.';
  }
  attachProviderListeners(provider);
  renderWalletBadge();
  closeWalletModal();

  if (state.connectedWallet) {
    showConfirmation('Wallet connected.', `Connected ${shortenAddress(state.connectedWallet)} with ${normalizeProviderName(providerName)} for the user-facing flow. OWS vault execution remains protected in the background.${networkNotice}`);
    await analyzeWalletBehavior(true);
  } else {
    showConfirmation('Wallet connection failed.', 'No account was returned by the selected wallet. Try another wallet or reopen the picker.');
  }
}

async function connectWalletConnect() {
  const provider = await getWalletConnectProvider();
  await connectWalletWithProvider(provider, 'WalletConnect', 'walletconnect');
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
  const provider = getActiveProvider();
  if (!provider) {
    showConfirmation('Wallet provider missing.', 'Reconnect your wallet and try again.');
    return;
  }

  try {
    await provider.request({
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
  showSuccessToast('Plan approved', 'Success. Keep building your onchain savings one step at a time.');
}

async function analyzeWalletBehavior(auto = false) {
  if (!state.connectedWallet) {
    resetDiagnosis();
    const message = 'Connect your wallet first to analyze your protection behavior.';
    if (!auto) showConfirmation('Wallet required.', message);
    return;
  }

  if (diagnosisInFlight) return;
  diagnosisInFlight = true;
  els.analyzeWalletButton.textContent = 'Analyzing...';
  els.diagnosisSummary.textContent = 'Reading wallet activity across supported chains and building a protection profile.';

  try {
    const response = await fetch('/api/wallet-diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: state.connectedWallet })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Wallet analysis failed.');
    }

    renderDiagnosis(data);
    if (!auto) {
      showConfirmation(
        `Profit Protection Score: ${data.diagnosis.score}/100.`,
        data.recommendation.treatment
      );
    }
  } catch (error) {
    els.scoreValue.textContent = '--/100';
    els.scoreStatus.textContent = 'Unavailable';
    els.scoreStatus.className = 'diagnosis-pill unavailable';
    els.diagnosisSummary.textContent = error.message;
    els.diagnosisTreatment.textContent = 'Try again after reconnecting the wallet or checking wallet activity.';
    if (!auto) showConfirmation('Wallet analysis failed.', error.message);
  } finally {
    diagnosisInFlight = false;
    els.analyzeWalletButton.textContent = 'Analyze wallet';
  }
}

async function runOnchainDemo() {
  els.onchainLink.hidden = true;

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
    const explorer = NETWORKS[state.selectedChainId]?.blockExplorerUrls?.[0];
    if (explorer) {
      els.onchainLink.href = `${explorer}/tx/${hash}`;
      els.onchainLink.hidden = false;
    }
    showConfirmation('Onchain demo sent.', `The trader wallet broadcast a live transfer into the goal vault on ${data.execution.chain}.`);
    return;
  }

  const note = data.execution?.note || data.execution?.error || data.error || 'The transfer could not be broadcast.';
  els.onchainHeadline.textContent = 'Transfer path is ready.';
  els.onchainBody.textContent = note;
  els.onchainLink.hidden = true;
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

els.walletConnectButton.addEventListener('click', () => {
  openWalletModal();
});

els.walletDisconnectButton.addEventListener('click', async () => {
  if (state.currentProviderType === 'walletconnect' && state.currentProvider?.disconnect) {
    try {
      await state.currentProvider.disconnect();
    } catch (_error) {
      // Ignore disconnect transport errors and still clear local state.
    }
  }
  if (activeProviderCleanup) activeProviderCleanup();
  state.currentProvider = null;
  state.currentProviderType = null;
  state.currentProviderName = null;
  state.connectedWallet = null;
  state.connectedChainId = null;
  renderWalletBadge();
  resetDiagnosis();
  showConfirmation('Wallet disconnected.', 'You can now reconnect and choose a different wallet from the picker.');
});

els.analyzeWalletButton.addEventListener('click', async () => {
  await analyzeWalletBehavior(false);
});

els.networkSelect.addEventListener('change', async () => {
  state.selectedChainId = els.networkSelect.value;
  renderWalletBadge();

  if (state.connectedWallet && getActiveProvider()) {
    try {
      await ensureBaseSepolia(getActiveProvider());
      renderWalletBadge();
    } catch (error) {
      showConfirmation('Network switch failed.', error.message);
    }
  }
});

els.walletModalBackdrop.addEventListener('click', closeWalletModal);
els.walletModalClose.addEventListener('click', closeWalletModal);
els.walletModalList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-wallet-id]');
  if (!button) return;
  const wallet = discoveredWallets.get(button.dataset.walletId);
  if (!wallet) return;
  try {
    await connectWalletWithProvider(wallet.provider, wallet.info.name, 'injected');
  } catch (error) {
    showConfirmation('Wallet connection failed.', error.message);
  }
});
els.walletConnectQrButton.addEventListener('click', async () => {
  try {
    await connectWalletConnect();
  } catch (error) {
    showConfirmation('WalletConnect failed.', error.message);
  }
});

els.themeToggle.addEventListener('click', () => {
  const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

loadTheme();
makeLogoTransparent();
render();
resetDiagnosis();
loadOwsStatus();
discoverInjectedWallets();
