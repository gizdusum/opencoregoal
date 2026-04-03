const MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2.2';

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

  if (realizedProfitUsd > 0 && totalSells === 0) score -= 12;
  if (tradeBalance < 0.25 && totalTrades > 10) score -= 10;

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

module.exports = async (req, res) => {
  const key = process.env.MORALIS_API_KEY || '';
  const address = String(req.body?.address || '').trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'A valid EVM wallet address is required.' }));
    return;
  }

  if (!key) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'MORALIS_API_KEY is not configured in Vercel.' }));
    return;
  }

  const headers = {
    accept: 'application/json',
    'X-API-Key': key
  };

  try {
    const [chainActivityResult, netWorthResult] = await Promise.allSettled([
      fetchJson(`${MORALIS_API_URL}/wallets/${address}/chains`, { headers }),
      fetchJson(
        `${MORALIS_API_URL}/wallets/${address}/net-worth?chains%5B0%5D=eth&chains%5B1%5D=base&chains%5B2%5D=arbitrum&chains%5B3%5D=optimism&chains%5B4%5D=polygon&exclude_spam=true&exclude_unverified_contracts=true`,
        { headers }
      )
    ]);

    const chainActivity =
      chainActivityResult.status === 'fulfilled' ? chainActivityResult.value : { active_chains: [] };
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

    const payload = {
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

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
};
