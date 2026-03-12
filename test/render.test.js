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
    squareDisclosureEnabled: true,
    squareDisclosureAskEveryTime: false
  },
  chain: 'Global',
  window: '24h',
  generatedAt: '2026-03-12T09:00:00.000Z',
  upstreamCalls: [],
  marketTheme: { summary: '测试主线', signals: [], stance: '观察' },
  spotLeaderboards: {
    gainersTop3: [{ symbol: 'ROBO', chain: 'Spot', metricLabel: '涨幅', metricValue: '+10%' }],
    losersTop3: []
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
  watchlist: [{ symbol: 'ROBO', chain: 'BSC', action: '看', score: 80, reason: '真的有结论' }],
  riskAlerts: [],
  walletAppendix: { summary: '', notes: [] },
  conclusion: ['真实结论 1', '真实结论 2'],
  helpCards: [{ title: '帮助', description: 'desc', examples: [] }]
};

test('scopeLabel 支持 bsc 单链标签', () => {
  assert.equal(scopeLabel(data), 'BSC');
});

test('Square 模式使用真实 conclusion 且保留署名和字数', () => {
  const text = renderSquare(data);
  assert.match(text, /本文由OpenClaw发出/);
  assert.match(text, /真实结论 1/);
  assert.match(text, /字数统计：/);
  assert.doesNotMatch(text, /什/);
});

test('Square help 模式不会丢署名', () => {
  const text = renderSquare({ ...data, queryType: 'help' });
  assert.match(text, /本文由OpenClaw发出/);
  assert.match(text, /Alpha 可用功能/);
});

test('Report 模式遵守模块开关', () => {
  const text = renderReport(data);
  assert.doesNotMatch(text, /## 现货涨幅前三/);
  assert.doesNotMatch(text, /## 交易所热度前三/);
  assert.doesNotMatch(text, /## 钱包热度前三/);
  assert.doesNotMatch(text, /## Meme 雷达/);
  assert.match(text, /## 衍生品情绪/);
});
