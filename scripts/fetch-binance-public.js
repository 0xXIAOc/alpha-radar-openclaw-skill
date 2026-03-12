#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SPOT_BASE = 'https://api.binance.com';
const FUTURES_BASE = 'https://fapi.binance.com';

function readOptionValue(argv, index, token) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Missing value for ${token}`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    output: '',
    futuresSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    top: 3,
    minQuoteVolume: 1_000_000
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--output') {
      args.output = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--futures-symbols') {
      args.futuresSymbols = String(readOptionValue(argv, i, token))
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);
      i += 1;
    } else if (token === '--top') {
      args.top = Math.max(1, Math.min(Number(readOptionValue(argv, i, token)) || 3, 10));
      i += 1;
    } else if (token === '--min-quote-volume') {
      args.minQuoteVolume = Number(readOptionValue(argv, i, token)) || 1_000_000;
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/fetch-binance-public.js --output /tmp/binance-public.json',
    '',
    'Options:',
    '  --output <path>              Output JSON path',
    '  --futures-symbols <list>     e.g. BTCUSDT,ETHUSDT,SOLUSDT',
    '  --top <n>                    number of gainers/losers to keep',
    '  --min-quote-volume <n>       filter spot tickers by quoteVolume'
  ].join('\n');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function toNum(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function stripQuoteAsset(symbol) {
  const quotes = ['USDT', 'FDUSD', 'USDC', 'BTC', 'ETH', 'BNB', 'TRY', 'EUR'];
  const quote = quotes.find((q) => symbol.endsWith(q));
  return quote ? symbol.slice(0, -quote.length) : symbol;
}

function pickSpotLeaderboards(tickers, top, minQuoteVolume) {
  const filtered = tickers
    .filter((t) => t.symbol.endsWith('USDT'))
    .filter((t) => toNum(t.quoteVolume) >= minQuoteVolume)
    .map((t) => ({
      symbol: stripQuoteAsset(t.symbol),
      pair: t.symbol,
      metricLabel: '涨幅',
      metricValue: `${toNum(t.priceChangePercent).toFixed(2)}%`,
      rawChangePct: toNum(t.priceChangePercent),
      quoteVolume: toNum(t.quoteVolume),
      note: `24h成交 ${Math.round(toNum(t.quoteVolume)).toLocaleString()} USDT`
    }));

  const gainers = [...filtered]
    .sort((a, b) => b.rawChangePct - a.rawChangePct)
    .slice(0, top)
    .map((x) => ({
      symbol: x.symbol,
      chain: 'Spot',
      metricLabel: '涨幅',
      metricValue: x.metricValue,
      note: x.note
    }));

  const losers = [...filtered]
    .sort((a, b) => a.rawChangePct - b.rawChangePct)
    .slice(0, top)
    .map((x) => ({
      symbol: x.symbol,
      chain: 'Spot',
      metricLabel: '跌幅',
      metricValue: `${x.rawChangePct.toFixed(2)}%`,
      note: x.note
    }));

  return { gainersTop3: gainers, losersTop3: losers };
}

async function fetchLongShort(symbol) {
  const [globalLs, topLs, oiHist, funding, taker] = await Promise.allSettled([
    fetchJson(`${FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=2`),
    fetchJson(`${FUTURES_BASE}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=1h&limit=2`),
    fetchJson(`${FUTURES_BASE}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=2`),
    fetchJson(`${FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
    fetchJson(`${FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=2`)
  ]);

  function latestValue(settled) {
    if (settled.status !== 'fulfilled') return null;
    const arr = settled.value;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[arr.length - 1];
  }

  function pctChangeFromLastTwo(settled, field) {
    if (settled.status !== 'fulfilled') return null;
    const arr = settled.value;
    if (!Array.isArray(arr) || arr.length < 2) return null;
    const prev = toNum(arr[arr.length - 2][field], NaN);
    const cur = toNum(arr[arr.length - 1][field], NaN);
    if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }

  const gl = latestValue(globalLs);
  const tl = latestValue(topLs);
  const oi = latestValue(oiHist);
  const fr = latestValue(funding);
  const tk = latestValue(taker);

  const globalRatio = gl ? toNum(gl.longShortRatio, NaN) : NaN;
  const topRatio = tl ? toNum(tl.longShortRatio, NaN) : NaN;
  const oiChangePct = pctChangeFromLastTwo(oiHist, 'sumOpenInterest');
  const takerRatio = tk ? toNum(tk.buySellRatio, NaN) : NaN;
  const fundingRate = fr ? toNum(fr.fundingRate, NaN) : NaN;

  let stance = '中性';
  if (Number.isFinite(topRatio) && topRatio > 1.1 && Number.isFinite(globalRatio) && globalRatio > 1.0) {
    stance = '多头偏强';
  } else if (
    Number.isFinite(topRatio) &&
    topRatio < 0.9 &&
    Number.isFinite(globalRatio) &&
    globalRatio < 1.0
  ) {
    stance = '空头偏强';
  } else if (
    Number.isFinite(topRatio) &&
    Number.isFinite(globalRatio) &&
    topRatio > globalRatio + 0.15
  ) {
    stance = '大户偏多，散户偏弱';
  } else if (
    Number.isFinite(topRatio) &&
    Number.isFinite(globalRatio) &&
    topRatio + 0.15 < globalRatio
  ) {
    stance = '散户偏多，大户偏保守';
  }

  return {
    symbol,
    globalLongShortRatio: Number.isFinite(globalRatio) ? Number(globalRatio.toFixed(3)) : null,
    topLongShortRatio: Number.isFinite(topRatio) ? Number(topRatio.toFixed(3)) : null,
    openInterestValue: oi ? String(oi.sumOpenInterestValue) : '',
    openInterestChangePct: Number.isFinite(oiChangePct) ? Number(oiChangePct.toFixed(2)) : null,
    fundingRate: Number.isFinite(fundingRate) ? Number(fundingRate.toFixed(6)) : null,
    takerBuySellRatio: Number.isFinite(takerRatio) ? Number(takerRatio.toFixed(3)) : null,
    stance
  };
}

function buildFuturesSummary(panels) {
  const valid = panels.filter(Boolean);
  if (valid.length === 0) {
    return '本轮未成功获取衍生品情绪数据。';
  }

  const strongLong = valid.filter((x) => String(x.stance || '').includes('多')).length;
  const strongShort = valid.filter((x) => String(x.stance || '').includes('空')).length;

  if (strongLong >= 2) {
    return '衍生品情绪整体偏多，但需要留意资金费率与持仓量是否同步升温。';
  }
  if (strongShort >= 2) {
    return '衍生品情绪整体偏空，短线更适合谨慎处理追涨。';
  }
  return '衍生品情绪分化较大，更适合结合现货热度和成交结构判断。';
}

function ensureTop3(list) {
  return Array.isArray(list) ? list.slice(0, 3) : [];
}

function summarizeResultStatus(isOk, hasAnyData) {
  if (isOk && hasAnyData) return 'ok';
  if (!isOk && hasAnyData) return 'partial';
  return 'failed';
}

function buildUpstreamCalls(spotOk, spotLeaderboards, futuresOk, futuresPanels) {
  const hasSpotData =
    ensureTop3(spotLeaderboards?.gainersTop3).length > 0 || ensureTop3(spotLeaderboards?.losersTop3).length > 0;
  const validFuturesPanels = (Array.isArray(futuresPanels) ? futuresPanels : []).filter(
    (x) => x && !String(x.stance || '').startsWith('获取失败')
  );
  const hasFuturesData = validFuturesPanels.length > 0;

  return [
    {
      skill: 'spot-public-api',
      status: summarizeResultStatus(spotOk, hasSpotData),
      message: spotOk
        ? '通过 Binance Spot 公开 API 获取现货 24h 榜单'
        : hasSpotData
          ? 'Spot 主请求失败，但保留了可用现货榜单'
          : '未能获取现货 24h 榜单'
    },
    {
      skill: 'futures-public-api',
      status: summarizeResultStatus(futuresOk, hasFuturesData),
      message: futuresOk
        ? '通过 Binance Futures 公开 API 获取多空比、持仓量、资金费率和主动买卖量比'
        : hasFuturesData
          ? '部分衍生品面板成功，部分请求失败'
          : '未能获取衍生品情绪数据'
    }
  ];
}

function buildConclusion(spotLeaderboards, futuresSummary) {
  const gainers = ensureTop3(spotLeaderboards?.gainersTop3);
  const first = gainers[0]?.symbol || '强势现货';
  return [
    `现货端最强的短线注意力集中在 ${first} 这类高弹性标的，但不要只看涨幅，必须同步看成交和持仓结构。`,
    futuresSummary,
    '如果现货热度、持仓量变化和主动买卖量比不能共振，优先把结论放在“观察”而不是“追涨”。'
  ];
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  let spotOk = false;
  let spotLeaderboards = { gainersTop3: [], losersTop3: [] };
  let spotError = '';

  try {
    const spotTicker = await fetchJson(`${SPOT_BASE}/api/v3/ticker/24hr`);
    spotLeaderboards = pickSpotLeaderboards(spotTicker, args.top, args.minQuoteVolume);
    spotOk = true;
  } catch (error) {
    spotError = error.message;
  }

  const futuresPanelsRaw = await Promise.all(
    args.futuresSymbols.map(async (symbol) => {
      try {
        return await fetchLongShort(symbol);
      } catch (error) {
        return {
          symbol,
          globalLongShortRatio: null,
          topLongShortRatio: null,
          openInterestValue: '',
          openInterestChangePct: null,
          fundingRate: null,
          takerBuySellRatio: null,
          stance: `获取失败: ${error.message}`
        };
      }
    })
  );

  const futuresPanels = futuresPanelsRaw.filter(Boolean);
  const validFuturesPanels = futuresPanels.filter((x) => !String(x.stance || '').startsWith('获取失败'));
  const futuresOk = validFuturesPanels.length === futuresPanels.length && futuresPanels.length > 0;
  const futuresSummary = buildFuturesSummary(validFuturesPanels);
  const now = new Date().toISOString();

  const upstreamCalls = buildUpstreamCalls(spotOk, spotLeaderboards, futuresOk, futuresPanels);
  if (!spotOk && spotError) {
    upstreamCalls[0].message = `${upstreamCalls[0].message}：${spotError}`;
  }

  const payload = {
    title: '',
    queryType: 'market',
    tokenQuery: {},
    mode: 'tg',
    chainScope: 'global',
    selectedChains: ['Spot', 'Futures'],
    previewOnly: true,
    preferences: {
      profile: 'balanced',
      risk: 'balanced',
      topN: 3,
      lang: 'zh',
      wallet: true,
      preview: true,
      showSpotLeaderboards: true,
      showExchangeHot: false,
      showWalletHot: false,
      showMemeRadar: false,
      squareDisclosureEnabled: false,
      squareDisclosureAskEveryTime: true
    },
    chain: 'Global',
    window: '24h',
    generatedAt: now,
    upstreamCalls,
    marketTheme: {
      summary: '本轮使用 Binance 公开 API 构建现货榜单与衍生品情绪面板。',
      signals: [
        '现货榜单来自 Spot 24h ticker 统计',
        '衍生品情绪来自全市场多空比、头部交易员多空比、持仓量、资金费率和主动买卖量比'
      ],
      stance: '观察确认'
    },
    spotLeaderboards,
    leaderboards: { exchangeHotTop3: [], walletHotTop3: [] },
    memeRadar: { summary: '', top3: [] },
    futuresSentiment: {
      summary: futuresSummary,
      panels: futuresPanels
    },
    watchlist: [],
    riskAlerts: [],
    walletAppendix: { summary: '', notes: [] },
    conclusion: buildConclusion(spotLeaderboards, futuresSummary),
    helpCards: []
  };

  const text = JSON.stringify(payload, null, 2);
  if (args.output) {
    const resolved = path.resolve(process.cwd(), args.output);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, text, 'utf8');
  }

  process.stdout.write(text);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`[fetch-binance-public] ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  usage,
  fetchJson,
  toNum,
  stripQuoteAsset,
  pickSpotLeaderboards,
  fetchLongShort,
  buildFuturesSummary,
  ensureTop3,
  buildUpstreamCalls,
  buildConclusion,
  summarizeResultStatus
};
