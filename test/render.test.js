'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderSquare, renderReport, scopeLabel } = require('../src/render');

const data = {
  title: '',
  queryType: 'market',
  tokenQuery: {},
  mode: 'report',
  chainScope: 'bsc',
  selectedChains: [],
  previewOnly: true,
  preferences: {
    profile: 'balanced',
    risk: 'balanced',
    topN: 3,
    lang: 'zh',
    wallet: true,
    preview: true,
    showSpotLeaderboards: false,
    showExchangeHot: false,
    showWalletHot: false,
    showMemeRadar: false,
    showFuturesSentiment: true,
    squareDisclosureEnabled: true,
    squareDisclosureAskEveryTime: false
  },
  chain: 'Global',
  window: '24h',
  generatedAt: '2026-03-12T09:00:00.000Z',
  upstreamCalls: [],
  fearGreedIndex: {
    value: 27,
    classification: 'Fear',
    source: 'Alternative.me API'
  },
  marketTheme: { summary: '测试主线', signals: [], stance: '观察' },
  spotLeaderboards: {
    gainersTop3: [{ symbol: 'ROBO', chain: 'Spot', metricLabel: '涨幅', metricValue: '+10%' }],
    losersTop3: []
  },
  alphaLeaderboards: {
    volumeTop3: [{ symbol: 'AIXBT', chain: 'Alpha', metricLabel: '24h成交量', metricValue: '$10M' }],
    volumeTop3NoUsdsFutures: [{ symbol: 'COOKIE', chain: 'Alpha', metricLabel: '24h成交量', metricValue: '$8M' }]
  },
  futuresLeaderboards: {
    fundingTop3: [{ symbol: 'WIFUSDT', chain: 'U本位', metricLabel: '资金费率', metricValue: '0.10%' }],
    gainersTop3WithFunding: [
      { symbol: 'WIFUSDT', chain: 'U本位', metricLabel: '24h涨幅', metricValue: '+12%', note: '资金费率 0.10%' }
    ]
  },
  leaderboards: {
    exchangeHotTop3: [{ symbol: 'HOT', chain: 'BSC', metricLabel: '热度', metricValue: '99' }],
    walletHotTop3: [{ symbol: 'WAL', chain: 'BSC', metricLabel: '热度', metricValue: '88' }]
  },
  memeRadar: { summary: 'meme test', top3: [{ symbol: 'MEME', chain: 'BSC', reason: 'test' }] },
  futuresSentiment: {
    summary: 'futures test',
    panels: [{ symbol: 'BTCUSDT', topLongShortRatio: 1.2, globalLongShortRatio: 1.1, stance: '多头偏强' }]
  },
  watchlist: [{ symbol: 'ROBO', chain: 'BSC', action: '看', score: 80, reason: '真的有结论', sourceFlags: ['alpha'] }],
  riskAlerts: [],
  walletAppendix: { summary: '', notes: [] },
  conclusion: ['真实结论 1', '真实结论 2'],
  helpCards: [{ title: '帮助', description: 'desc', examples: [] }]
};

test('scopeLabel supports bsc single-chain label', () => {
  assert.equal(scopeLabel(data), 'BSC');
});

test('Square mode uses real conclusion and keeps disclosure and fear greed', () => {
  const text = renderSquare(data);
  assert.match(text, /本文由OpenClaw发出/);
  assert.match(text, /真实结论 1/);
  assert.match(text, /加密货币恐惧和贪婪指数：27（恐惧）/);
  assert.match(text, /字数统计：/);
});

test('Square help mode keeps disclosure', () => {
  const text = renderSquare({ ...data, queryType: 'help' });
  assert.match(text, /本文由OpenClaw发出/);
  assert.match(text, /Alpha 可用功能/);
});

test('Report mode no longer renders exchange and wallet hot sections', () => {
  const text = renderReport(data);
  assert.doesNotMatch(text, /## 交易所热度前三/);
  assert.doesNotMatch(text, /## 钱包热度前三/);
  assert.match(text, /## Alpha 24h 成交量前 3/);
  assert.match(text, /## U 本位当前资金费最高 TOP 1/);
  assert.match(text, /## Meme 雷达/);
});
