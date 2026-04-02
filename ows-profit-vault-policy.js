#!/usr/bin/env node

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  let payload = {};

  try {
    payload = input ? JSON.parse(input) : {};
  } catch (error) {
    process.stdout.write(JSON.stringify({
      allow: false,
      reason: 'Invalid policy context payload.'
    }));
    return;
  }

  const config = payload.config || {};
  const request = payload.request || {};
  const requestedMonthlyUsd = Number(request.monthlyCapUsd || 0);
  const requestedProfitShare = Number(request.profitSharePct || 0);
  const requestedAsset = String(request.asset || '').toUpperCase();
  const requestedChainId = String(request.chainId || '');

  const maxMonthlyUsd = Number(config.maxMonthlyUsd || 250);
  const maxProfitShare = Number(config.profitSharePct || 10);
  const stableAsset = String(config.stableAsset || 'USDC').toUpperCase();
  const destination = config.destination || 'goal-vault';
  const allowedChains = Array.isArray(config.allowedChains) ? config.allowedChains : ['eip155:1', 'eip155:84532'];

  if (requestedAsset && requestedAsset !== stableAsset) {
    process.stdout.write(JSON.stringify({
      allow: false,
      reason: `Only ${stableAsset} savings sweeps are allowed for this vault.`
    }));
    return;
  }

  if (requestedMonthlyUsd > maxMonthlyUsd) {
    process.stdout.write(JSON.stringify({
      allow: false,
      reason: `Monthly savings cap exceeded. Limit is $${maxMonthlyUsd}.`
    }));
    return;
  }

  if (requestedProfitShare > maxProfitShare) {
    process.stdout.write(JSON.stringify({
      allow: false,
      reason: `Profit sweep exceeds policy. Limit is ${maxProfitShare}%.`
    }));
    return;
  }

  if (requestedChainId && !allowedChains.includes(requestedChainId)) {
    process.stdout.write(JSON.stringify({
      allow: false,
      reason: `Chain ${requestedChainId} is outside the allowed vault routes.`
    }));
    return;
  }

  process.stdout.write(JSON.stringify({
    allow: true,
    reason: `OpenCoreGoal policy approved: ${stableAsset} savings may move to ${destination} within the monthly cap and profit sweep rules.`
  }));
});

if (process.stdin.isTTY) {
  process.stdin.emit('end');
}
