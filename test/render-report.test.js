'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../examples/sample-data.json');
const { validateReportData } = require('../src/schema');
const { renderTg, renderReport, renderSquare } = require('../src/render');
const { parseNaturalCommand, normalizeData } = require('../scripts/render-report');

test('validateReportData accepts final payload shape with base support', () => {
  const result = validateReportData(sample);
  assert.equal(result.queryType, 'market');
  assert.equal(result.preferences.squareDisclosureEnabled, false);
  assert.equal(result.preferences.showSpotLeaderboards, true);
  assert.ok(result.selectedChains.includes('Base'));
});

test('parseNaturalCommand understands help mode', () => {
  const result = parseNaturalCommand('Alpha 有哪些功能');
  assert.equal(result.queryType, 'help');
});

test('parseNaturalCommand understands base alias and module toggles', () => {
  const result = parseNaturalCommand('Base 广场版 前3 署名开 不再询问 现货关 热度开 钱包热度关 meme开');
  assert.equal(result.scope, 'base');
  assert.equal(result.style, 'square');
  assert.equal(result.top, '3');
  assert.equal(result.disclosure, 'true');
  assert.equal(result.askDisclosure, 'false');
  assert.equal(result.showSpot, 'false');
  assert.equal(result.showExchangeHot, 'true');
  assert.equal(result.showWalletHot, 'false');
  assert.equal(result.showMeme, 'true');
});

test('normalizeData can switch to token mode from natural command', () => {
  const result = normalizeData(sample, {
    command: '查询ROBO的信息 链=bsc 广场版'
  });

  assert.equal(result.queryType, 'token');
  assert.equal(result.mode, 'square');
  assert.equal(result.chainScope, 'bsc');
  assert.equal(result.tokenQuery.symbol, 'ROBO');
});

test('renderTg includes spot and hot leaderboards and meme radar', () => {
  const output = renderTg(validateReportData(sample));
  assert.match(output, /现货涨幅前三/);
  assert.match(output, /现货跌幅前三/);
  assert.match(output, /交易所热度前三/);
  assert.match(output, /钱包热度前三/);
  assert.match(output, /Meme 雷达/);
});

test('renderReport includes simplified trader sections', () => {
  const output = renderReport(validateReportData(sample));
  assert.match(output, /## 现货涨幅前三/);
  assert.match(output, /## 现货跌幅前三/);
  assert.match(output, /## 交易所热度前三/);
  assert.match(output, /## 钱包热度前三/);
  assert.match(output, /## Meme 雷达/);
});

test('renderSquare supports disclosure line', () => {
  const output = renderSquare(
    validateReportData({
      ...sample,
      preferences: {
        ...sample.preferences,
        squareDisclosureEnabled: true
      }
    })
  );

  assert.match(output, /本文由OpenClaw发出/);
  assert.match(output, /现货涨幅前三/);
  assert.match(output, /交易所热度前三/);
});

test('render help mode works', () => {
  const output = renderTg(
    validateReportData({
      ...sample,
      queryType: 'help'
    })
  );
  assert.match(output, /Alpha 可用功能/);
  assert.match(output, /全网速览/);
});

test('render token card works for Base token', () => {
  const tokenData = validateReportData({
    title: '',
    queryType: 'token',
    tokenQuery: {
      symbol: 'AERO',
      chain: 'Base'
    },
    mode: 'square',
    chainScope: 'base',
    selectedChains: ['Base'],
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
    chain: 'Base',
    window: '24h',
    generatedAt: '2026-03-11T20:00:00Z',
    upstreamCalls: [
      { skill: 'query-token-info', status: 'ok' },
      { skill: 'trading-signal', status: 'ok' },
      { skill: 'query-token-audit', status: 'ok' }
    ],
    marketTheme: {},
    spotLeaderboards: { gainersTop3: [], losersTop3: [] },
    leaderboards: { exchangeHotTop3: [], walletHotTop3: [] },
    memeRadar: { summary: '', top3: [] },
    watchlist: [
      {
        symbol: 'AERO',
        chain: 'Base',
        action: '看',
        score: 74,
        confidence: 'medium',
        reason: 'Base 侧更适合作为叙事跟踪票，热度与资金关注度都有延续空间。',
        metrics: {
          price: '1.82',
          volume24h: '12.2M',
          liquidity: '9.4M',
          top10Pct: '36.1%',
          riskLevel: 'LOW'
        },
        risk: '更适合观察结构延续，不适合把它当作最高弹性情绪票。',
        next: '看 Base 资金是否继续扩张。'
      }
    ],
    riskAlerts: [],
    walletAppendix: {},
    conclusion: ['代币当前更适合作为 Base 侧结构观察，而不是情绪化追高。'],
    helpCards: []
  });

  const output = renderSquare(tokenData);
  assert.match(output, /Alpha Radar｜AERO/);
  assert.match(output, /看点：/);
  assert.match(output, /风险：/);
});
