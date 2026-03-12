'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeData, parseNaturalCommand } = require('../scripts/render-report');

const baseData = {
  queryType: 'market',
  tokenQuery: {},
  mode: 'tg',
  chainScope: 'global',
  selectedChains: [],
  previewOnly: true,
  preferences: {
    profile: 'balanced',
    risk: 'balanced',
    topN: 3,
    lang: 'zh',
    wallet: true,
    preview: true,
    showSpotLeaderboards: true,
    showExchangeHot: true,
    showWalletHot: true,
    showMemeRadar: true,
    squareDisclosureEnabled: false,
    squareDisclosureAskEveryTime: true
  },
  chain: 'Global',
  window: '24h',
  upstreamCalls: [],
  marketTheme: {},
  spotLeaderboards: { gainersTop3: [], losersTop3: [] },
  leaderboards: { exchangeHotTop3: [], walletHotTop3: [] },
  memeRadar: { summary: '', top3: [] },
  futuresSentiment: { summary: '', panels: [] },
  watchlist: [],
  riskAlerts: [],
  walletAppendix: { summary: '', notes: [] },
  conclusion: [],
  helpCards: []
};

test('parseNaturalCommand 支持中文 top 和保留 scope 词', () => {
  const parsed = parseNaturalCommand('全网 广场版 前三');
  assert.equal(parsed.scope, 'global');
  assert.equal(parsed.style, 'square');
  assert.equal(parsed.top, '3');

  const reserved = parseNaturalCommand('看 Base');
  assert.equal(reserved.token, undefined);
  assert.equal(reserved.scope, 'base');
});

test('normalizeData 对 bsc scope 会同步 chain 标签', () => {
  const data = normalizeData(baseData, { command: 'bsc 完整版 前五' });
  assert.equal(data.chainScope, 'bsc');
  assert.equal(data.chain, 'BSC');
  assert.equal(data.mode, 'report');
  assert.equal(data.preferences.topN, 5);
});

test('normalizeData token 模式不会吞掉 scope', () => {
  const data = normalizeData(baseData, { command: '查询ROBO的信息 base' });
  assert.equal(data.queryType, 'token');
  assert.equal(data.tokenQuery.symbol, 'ROBO');
  assert.equal(data.chainScope, 'base');
  assert.equal(data.tokenQuery.chain, 'Base');
});
