const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { JsonRpcProvider, Transaction, parseEther, formatEther } = require('ethers');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const POLICY_FILE = path.join(ROOT, 'ows-profit-vault-policy.json');
const POLICY_EXECUTABLE = path.join(ROOT, 'ows-profit-vault-policy.js');
const DEFAULT_RPC_URL = process.env.OPENCOREGOAL_RPC_URL || 'https://sepolia.base.org';
const DEFAULT_CHAIN_ID = 'eip155:84532';
const DEFAULT_CHAIN_NAME = 'Base Sepolia';
const ETH_CHAIN_ALIAS = 'ethereum';
const MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2.2';
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || '';

const wallets = {
  trader: {
    name: process.env.OPENCOREGOAL_TRADER_WALLET || 'opencoregoal-trader',
    address: process.env.OPENCOREGOAL_TRADER_ADDRESS || '0x2fB7002cFBc38be9F1263628d7dA7D21674b8b47'
  },
  vault: {
    name: process.env.OPENCOREGOAL_VAULT_WALLET || 'opencoregoal-vault',
    address: process.env.OPENCOREGOAL_VAULT_ADDRESS || '0x1b014cc5327806f2D470012B7F4370Ddba9cD548'
  }
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

function loadPolicyConfig() {
  return JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
}

function pickTxHash(parsed, fallback) {
  if (typeof parsed?.tx_hash === 'string') return parsed.tx_hash;
  if (typeof parsed?.txHash === 'string') return parsed.txHash;
  if (typeof parsed?.hash === 'string') return parsed.hash;
  if (typeof parsed?.transactionHash === 'string') return parsed.transactionHash;
  return fallback;
}

function normalizePlan(input = {}) {
  const amount = Math.max(Number(input.amount) || 50, 10);
  const cadence = ['weekly', 'monthly', 'yearly'].includes(input.cadence) ? input.cadence : 'weekly';
  const duration = [3, 6, 12, 24].includes(Number(input.duration)) ? Number(input.duration) : 12;
  const profitShare = Math.min(Math.max(Number(input.profitShare) || 10, 0), 20);
  const asset = ['USDC', 'USDT', 'DAI'].includes(String(input.asset || '').toUpperCase())
    ? String(input.asset).toUpperCase()
    : 'USDC';
  const goalPrompt = String(input.goalPrompt || '').trim() || 'Protect a share of my gains in a USDC goal vault.';
  const profitMode = Boolean(input.profitMode);
  const monthlyCapUsd =
    cadence === 'weekly' ? amount * 4 : cadence === 'monthly' ? amount : Math.max(Math.round(amount / 12), 25);
  const yearlyMultiplier = cadence === 'weekly' ? 52 / 12 : cadence === 'monthly' ? 1 : 1 / 12;
  const targetUsd = Math.round(amount * yearlyMultiplier * duration);

  const selectedChainId = ['eip155:84532', 'eip155:1'].includes(input.selectedChainId)
    ? input.selectedChainId
    : DEFAULT_CHAIN_ID;

  return {
    asset,
    amount,
    cadence,
    duration,
    goalPrompt,
    profitMode,
    profitShare,
    monthlyCapUsd,
    targetUsd,
    chainId: selectedChainId
  };
}

function computeProtectionDiagnosis({ activeChains = [], netWorth = {}, pnlByChain = [] }) {
  const supportedPnlChains = pnlByChain.filter((item) => item.ok);
  const totalTrades = supportedPnlChains.reduce((sum, item) => sum + (item.data.total_count_of_trades || 0), 0);
  const totalBuys = supportedPnlChains.reduce((sum, item) => sum + (item.data.total_buys || 0), 0);
  const totalSells = supportedPnlChains.reduce((sum, item) => sum + (item.data.total_sells || 0), 0);
  const realizedProfitUsd = supportedPnlChains.reduce(
    (sum, item) => sum + Number(item.data.total_realized_profit_usd || 0),
    0
  );
  const positivePctCount = supportedPnlChains.filter(
    (item) => Number(item.data.total_realized_profit_percentage || 0) > 0
  ).length;
  const tradeBalance = totalBuys > 0 ? totalSells / totalBuys : 0;
  const activeChainCount = activeChains.length;
  const totalNetWorthUsd = Number(netWorth.total_networth_usd || 0);
  const chainSpreadScore = Math.min(activeChainCount * 6, 18);
  const realizedProtectionScore = realizedProfitUsd > 0 ? 24 : 10;
  const profitableChainsScore = Math.min(positivePctCount * 8, 16);
  const sellDisciplineScore = Math.min(Math.round(tradeBalance * 20), 20);
  const volumeDisciplineScore = totalTrades <= 12 ? 18 : totalTrades <= 30 ? 12 : 6;
  const treasuryScore = totalNetWorthUsd >= 1000 ? 12 : totalNetWorthUsd >= 250 ? 8 : 4;

  let score =
    chainSpreadScore +
    realizedProtectionScore +
    profitableChainsScore +
    sellDisciplineScore +
    volumeDisciplineScore +
    treasuryScore;

  if (realizedProfitUsd > 0 && totalSells === 0) {
    score -= 12;
  }

  if (tradeBalance < 0.25 && totalTrades > 10) {
    score -= 10;
  }

  score = Math.max(8, Math.min(95, Math.round(score)));

  let status = 'Medium';
  if (score >= 70) status = 'High';
  if (score < 45) status = 'Low';

  let pattern = 'Builder';
  if (totalTrades > 25 && tradeBalance < 0.4) pattern = 'Reactive';
  else if (realizedProfitUsd > 0 && totalSells > 0) pattern = 'Protector';
  else if (totalTrades <= 8) pattern = 'Patient';

  const suggestedSweep = score >= 70 ? 5 : score >= 45 ? 10 : 15;
  const monthlyCapUsd =
    totalNetWorthUsd >= 5000 ? 500 : totalNetWorthUsd >= 1500 ? 250 : totalNetWorthUsd >= 500 ? 150 : 75;

  const summary =
    score >= 70
      ? 'You already protect gains better than most onchain users, but a vault rule can make that discipline automatic.'
      : score >= 45
        ? 'You capture upside, but you do not protect enough of it before the next decision cycle begins.'
        : 'Your wallet activity suggests that profits stay exposed too long and emotional re-entry risk is high.';

  const treatment =
    score >= 70
      ? `Treatment: keep a light ${suggestedSweep}% sweep into the USDC vault and cap monthly protection at $${monthlyCapUsd}.`
      : score >= 45
        ? `Treatment: sweep ${suggestedSweep}% of realized gains into the USDC vault and cap monthly protection at $${monthlyCapUsd} to build a calmer habit.`
        : `Treatment: start with a strict ${suggestedSweep}% profit sweep, protect gains weekly, and cap vaulting at $${monthlyCapUsd} until your behavior stabilizes.`;

  return {
    diagnosis: {
      score,
      status,
      pattern,
      summary,
      activeChains: activeChainCount,
      totalTrades,
      realizedProfitUsd: Number(realizedProfitUsd.toFixed(2))
    },
    recommendation: {
      profitSweepPct: suggestedSweep,
      monthlyCapUsd,
      treatment
    }
  };
}

async function analyzeWallet(address) {
  if (!MORALIS_API_KEY) {
    throw new Error('Moralis API key is not configured on the server.');
  }

  const headers = {
    accept: 'application/json',
    'X-API-Key': MORALIS_API_KEY
  };

  const [chainActivityResult, netWorthResult] = await Promise.allSettled([
    fetchJson(`${MORALIS_API_URL}/wallets/${address}/chains`, { headers }),
    fetchJson(
      `${MORALIS_API_URL}/wallets/${address}/net-worth?chains%5B0%5D=eth&chains%5B1%5D=base&chains%5B2%5D=arbitrum&chains%5B3%5D=optimism&chains%5B4%5D=polygon&exclude_spam=true&exclude_unverified_contracts=true`,
      { headers }
    )
  ]);

  const chainActivity = chainActivityResult.status === 'fulfilled' ? chainActivityResult.value : { active_chains: [] };
  const netWorth = netWorthResult.status === 'fulfilled' ? netWorthResult.value : { total_networth_usd: '0', chains: [] };

  const pnlChains = ['eth', 'base', 'polygon'];
  const pnlByChain = await Promise.all(
    pnlChains.map(async (chain) => {
      try {
        const data = await fetchJson(
          `${MORALIS_API_URL}/wallets/${address}/profitability/summary?chain=${chain}&days=all`,
          { headers }
        );
        return { chain, ok: true, data };
      } catch (error) {
        return { chain, ok: false, error: error.message };
      }
    })
  );

  const fallbackActiveChains = new Set((chainActivity.active_chains || []).map((item) => item.chain || item.chain_id));
  for (const chain of netWorth.chains || []) {
    if (Number(chain.networth_usd || 0) > 0) fallbackActiveChains.add(chain.chain);
  }
  for (const item of pnlByChain) {
    if (item.ok && Number(item.data.total_count_of_trades || 0) > 0) fallbackActiveChains.add(item.chain);
  }

  return {
    ok: true,
    address,
    chainActivity,
    netWorth,
    pnlByChain,
    ...computeProtectionDiagnosis({
      activeChains: Array.from(fallbackActiveChains),
      netWorth,
      pnlByChain
    })
  };
}

async function evaluatePolicy(plan) {
  const policy = loadPolicyConfig();
  const payload = {
    config: policy.config,
    request: {
      asset: plan.asset,
      monthlyCapUsd: plan.monthlyCapUsd,
      profitSharePct: plan.profitMode ? plan.profitShare : 0,
      chainId: plan.chainId
    }
  };
  const { stdout } = await runCommand('node', [POLICY_EXECUTABLE], {
    input: JSON.stringify(payload)
  });
  return {
    policyId: policy.id,
    ...JSON.parse(stdout)
  };
}

async function createLiveRequest(plan) {
  const policyResult = await evaluatePolicy(plan);
  if (!policyResult.allow) {
    return {
      ok: false,
      policy: policyResult
    };
  }

  const attestation = [
    'OpenCoreGoal live request',
    `Vault: ${wallets.vault.address}`,
    `Asset: ${plan.asset}`,
    `Sweep: $${plan.amount} ${plan.cadence}`,
    `Duration: ${plan.duration} months`,
    `Monthly cap: $${plan.monthlyCapUsd}`,
    `Profit sweep: ${plan.profitMode ? `${plan.profitShare}%` : 'disabled'}`,
    `Prompt: ${plan.goalPrompt}`
  ].join('\n');

  const { stdout } = await runCommand('ows', [
    'sign',
    'message',
    '--chain',
    ETH_CHAIN_ALIAS,
    '--wallet',
    wallets.vault.name,
    '--message',
    attestation,
    '--json'
  ]);

  let parsed = {};
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = { raw: stdout };
  }

  const signature = parsed.signature || parsed.sig || parsed.raw || stdout;

  return {
    ok: true,
    policy: policyResult,
    request: {
      wallet: wallets.vault.name,
      address: wallets.vault.address,
      attestation,
      signature
    }
  };
}

async function prepareUnsignedTransfer(plan) {
  const provider = new JsonRpcProvider(DEFAULT_RPC_URL);
  const nonce = await provider.getTransactionCount(wallets.trader.address, 'latest');
  const feeData = await provider.getFeeData();
  const balance = await provider.getBalance(wallets.trader.address);

  const valueEth = process.env.OPENCOREGOAL_TRANSFER_ETH || '0.00001';
  const value = parseEther(valueEth);

  const tx = Transaction.from({
    type: 2,
    chainId: 84532,
    to: wallets.vault.address,
    nonce,
    value,
    gasLimit: 21_000n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 1_500_000_000n,
    maxFeePerGas: feeData.maxFeePerGas || 2_000_000_000n
  });

  return {
    unsignedTx: tx.unsignedSerialized,
    nonce,
    valueEth,
    balanceEth: formatEther(balance)
  };
}

async function tryOnchainTransfer(plan) {
  const policyResult = await evaluatePolicy(plan);
  if (!policyResult.allow) {
    return {
      ok: false,
      policy: policyResult
    };
  }

  const prepared = await prepareUnsignedTransfer(plan);

  try {
    const { stdout } = await runCommand('ows', [
      'sign',
      'send-tx',
      '--chain',
      DEFAULT_CHAIN_ID,
      '--wallet',
      wallets.trader.name,
      '--tx',
      prepared.unsignedTx,
      '--rpc-url',
      DEFAULT_RPC_URL,
      '--json'
    ]);

    let parsed = {};
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = { raw: stdout };
    }

    return {
      ok: true,
      policy: policyResult,
      prepared,
      execution: {
        chain: DEFAULT_CHAIN_NAME,
        txHash: pickTxHash(parsed, stdout)
      }
    };
  } catch (error) {
    return {
      ok: false,
      policy: policyResult,
      prepared,
      execution: {
        chain: DEFAULT_CHAIN_NAME,
        error: error.message,
        note: 'Live onchain send is ready, but the trader wallet needs testnet gas to broadcast.'
      }
    };
  }
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/ows/status') {
    const policy = loadPolicyConfig();
    sendJson(res, 200, {
      ok: true,
      wallets,
      policy: {
        id: policy.id,
        config: policy.config
      },
      chain: {
        id: DEFAULT_CHAIN_ID,
        name: DEFAULT_CHAIN_NAME,
        rpcUrl: DEFAULT_RPC_URL
      }
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/ows/request') {
    const rawBody = await readBody(req);
    const plan = normalizePlan(rawBody ? JSON.parse(rawBody) : {});
    const result = await createLiveRequest(plan);
    sendJson(res, result.ok ? 200 : 403, { ...result, plan });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/ows/onchain-demo') {
    const rawBody = await readBody(req);
    const plan = normalizePlan(rawBody ? JSON.parse(rawBody) : {});
    const result = await tryOnchainTransfer(plan);
    sendJson(res, result.ok ? 200 : 202, { ...result, plan });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/wallet-diagnosis') {
    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const address = String(payload.address || '').trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      sendJson(res, 400, { ok: false, error: 'A valid EVM wallet address is required.' });
      return true;
    }

    const result = await analyzeWallet(address);
    sendJson(res, 200, result);
    return true;
  }

  return false;
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, pathname);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    const handled = await handleApi(req, res, url.pathname);
    if (handled) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`OpenCoreGoal server running at http://${HOST}:${PORT}`);
});
