'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../examples/sample-data.json');
const { validateReportData } = require('../src/schema');
const { renderTg, renderReport, renderSquare } = require('../src/render');
const { parseNaturalCommand, normalizeData } = require('../scripts/render-report');

test('validateReportData accepts the v5.1 market payload shape', () => {
  const result = validateReportData(sample);
  assert.equal(result.queryType, 'market');
  assert.equal(result.preferences.squareDisclosureEnabled, false);
  assert.equal(result.preferences.squareDisclosureAskEveryTime, true);
});

test('parseNaturalCommand understands disclosure flags', () => {
  const result = parseNaturalCommand('全网 广场版 前3 谨慎 钱包关 署名开 不再询问');
  assert.equal(result.scope, 'global');
  assert.equal(result.style, 'square');
  assert.equal(result.top, '3');
  assert.equal(result.profile, 'cautious');
  assert.equal(result.wallet, 'false');
  assert.equal(result.disclosure, 'true');
  assert.equal(result.askDisclosure, 'false');
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

test('renderTg includes leaderboards, spot focus, futures temperature, and meme radar', () => {
  const output = renderTg(validateReportData(sample));
  assert.match(output, /涨幅前三/);
  assert.match(output, /跌幅前三/);
  assert.match(output, /交易所热度前三/);
  assert.match(output, /钱包热度前三/);
  assert.match(output, /现货观察/);
  assert.match(output, /合约温度/);
  assert.match(output, /Meme 雷达/);
});

test('renderReport includes trader-focused sections', () => {
  const output = renderReport(validateReportData(sample));
  assert.match(output, /## 三、现货观察/);
  assert.match(output, /## 四、合约温度/);
  assert.match(output, /## 五、Meme 雷达/);
});

test('renderSquare supports disclosure line and leaderboards', () => {
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
  assert.match(output, /涨幅前三/);
  assert.match(output, /交易所热度前三/);
});

test('render token square works', () => {
  const tokenData = validateReportData({
    title: '',
    queryType: 'token',
    tokenQuery: {
      symbol: 'CAKE',
      chain: 'BSC'
    },
    mode: 'square',
    chainScope: 'bsc',
    selectedChains: ['BSC'],
    previewOnly: true,
    preferences: {
      profile: 'balanced',
      risk: 'balanced',
      topN: 3,
      lang: 'zh',
      wallet: true,
      preview: true,
      squareDisclosureEnabled: false,
      squareDisclosureAskEveryTime: true
    },
    chain: 'BSC',
    window: '24h',
    generatedAt: '2026-03-11T07:00:00Z',
    upstreamCalls: [
      { skill: 'query-token-info', status: 'ok' },
      { skill: 'trading-signal', status: 'ok' },
      { skill: 'query-token-audit', status: 'ok' }
    ],
    marketTheme: {},
    leaderboards: {
      gainersTop3: [],
      losersTop3: [],
      exchangeHotTop3: [],
      walletHotTop3: []
    },
    spotFocus: { summary: '', top3: [] },
    futuresTemperature: { summary: '', preferredChain: '', notes: [] },
    memeRadar: { summary: '', top3: [] },
    watchlist: [
      {
        symbol: 'CAKE',
        chain: 'BSC',
        action: '看',
        score: 79,
        confidence: 'high',
        reason: '更符合流动性、成交与结构共振。',
        metrics: {
          price: '3.11',
          volume24h: '18.4M',
          liquidity: '12.7M',
          top10Pct: '41.2%',
          riskLevel: 'LOW'
        },
        risk: '短线弹性不如纯情绪票。',
        next: '继续观察 active buy 是否延续。'
      }
    ],
    riskAlerts: [],
    walletAppendix: {},
    conclusion: ['代币当前更适合研究型跟踪，而不是情绪化追高。']
  });

  const output = renderSquare(tokenData);
  assert.match(output, /Alpha Radar｜CAKE/);
  assert.match(output, /看点：/);
  assert.match(output, /风险：/);
});
