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
    chainId: DEFAULT_CHAIN_ID
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
        txHash: parsed.txHash || parsed.hash || parsed.transactionHash || parsed.raw || stdout
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
