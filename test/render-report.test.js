'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../examples/sample-data.json');
const { validateReportData } = require('../src/schema');
const { renderTg, renderReport, renderSquare } = require('../src/render');
const { parseNaturalCommand, normalizeData } = require('../scripts/render-report');

test('validateReportData accepts final payload shape with alpha and futures extensions', () => {
  const result = validateReportData(sample);
  assert.equal(result.queryType, 'market');
  assert.equal(result.preferences.squareDisclosureEnabled, true);
  assert.equal(result.preferences.showFuturesSentiment, true);
  assert.equal(result.fearGreedIndex.value, 27);
  assert.equal(result.alphaLeaderboards.volumeTop3.length, 3);
  assert.equal(result.futuresLeaderboards.fundingTop3.length, 3);
});

test('parseNaturalCommand understands help mode', () => {
  const result = parseNaturalCommand('Alpha 有哪些功能');
  assert.equal(result.queryType, 'help');
});

test('parseNaturalCommand understands base alias and module toggles', () => {
  const result = parseNaturalCommand('Base 广场版 前3 署名开 不再询问 现货关 meme开 衍生品关');
  assert.equal(result.scope, 'base');
  assert.equal(result.style, 'square');
  assert.equal(result.top, '3');
  assert.equal(result.disclosure, 'true');
  assert.equal(result.askDisclosure, 'false');
  assert.equal(result.showSpot, 'false');
  assert.equal(result.showMeme, 'true');
  assert.equal(result.showFutures, 'false');
});

test('normalizeData can switch to token mode from natural command', () => {
  const result = normalizeData(sample, { command: '查询ROBO的信息 链=bsc 广场版' });
  assert.equal(result.queryType, 'token');
  assert.equal(result.mode, 'square');
  assert.equal(result.chainScope, 'bsc');
  assert.equal(result.tokenQuery.symbol, 'ROBO');
});

test('normalizeData maps futures toggle from natural command', () => {
  const result = normalizeData(sample, { command: '全网 衍生品关 长版' });
  assert.equal(result.mode, 'report');
  assert.equal(result.preferences.showFuturesSentiment, false);
});

test('renderTg includes fear greed, alpha leaderboards, futures leaderboards and meme radar', () => {
  const output = renderTg(validateReportData(sample));
  assert.match(output, /加密货币恐惧和贪婪指数：27（恐惧）/);
  assert.match(output, /Alpha 24h 成交量前 3/);
  assert.match(output, /Alpha 24h 成交量前 3（未上 U 本位合约）/);
  assert.match(output, /U 本位当前资金费最高 TOP 1/);
  assert.match(output, /U 本位当前资金费最高 TOP 3/);
  assert.match(output, /U 本位合约 24h 涨幅 TOP 3 \+ 对应资金费率/);
  assert.match(output, /衍生品情绪：/);
  assert.match(output, /Meme 雷达：/);
});

test('renderTg does not render exchange or wallet hot sections anymore', () => {
  const output = renderTg(validateReportData(sample));
  assert.doesNotMatch(output, /交易所热度前三/);
  assert.doesNotMatch(output, /钱包热度前三/);
});

test('renderTg watchlist line includes source flags and risk tags', () => {
  const output = renderTg(validateReportData(sample));
  assert.match(output, /来源：spot/);
  assert.match(output, /标签：高资金费率；高弹性；追高风险/);
});

test('renderReport includes fear greed, alpha sections and futures sections', () => {
  const output = renderReport(validateReportData(sample));
  assert.match(output, /## 加密货币恐惧和贪婪指数/);
  assert.match(output, /## Alpha 24h 成交量前 3/);
  assert.match(output, /## Alpha 24h 成交量前 3（未上 U 本位合约）/);
  assert.match(output, /## U 本位当前资金费最高 TOP 1/);
  assert.match(output, /## U 本位当前资金费最高 TOP 3/);
  assert.match(output, /## U 本位合约 24h 涨幅 TOP 3 \+ 对应资金费率/);
  assert.match(output, /## 衍生品情绪/);
  assert.match(output, /## Meme 雷达/);
  assert.match(output, /\| 指标 \| 数值 \|/);
});

test('renderReport no longer renders exchange and wallet hot sections', () => {
  const output = renderReport(validateReportData(sample));
  assert.doesNotMatch(output, /## 交易所热度前三/);
  assert.doesNotMatch(output, /## 钱包热度前三/);
});

test('renderReport hides futures block when toggle is off', () => {
  const output = renderReport(
    validateReportData({
      ...sample,
      preferences: { ...sample.preferences, showFuturesSentiment: false }
    })
  );
  assert.doesNotMatch(output, /## U 本位当前资金费最高 TOP 1/);
  assert.doesNotMatch(output, /## U 本位当前资金费最高 TOP 3/);
  assert.doesNotMatch(output, /## U 本位合约 24h 涨幅 TOP 3 \+ 对应资金费率/);
  assert.doesNotMatch(output, /## 衍生品情绪/);
});

test('renderSquare supports disclosure line and new market sections', () => {
  const output = renderSquare(
    validateReportData({ ...sample, preferences: { ...sample.preferences, squareDisclosureEnabled: true } })
  );
  assert.match(output, /本文由OpenClaw发出/);
  assert.match(output, /加密货币恐惧和贪婪指数：27（恐惧）/);
  assert.match(output, /Alpha 24h 成交量前 3/);
  assert.match(output, /U 本位当前资金费最高 TOP 1/);
});

test('render help mode works with explicit helpCards', () => {
  const output = renderTg(
    validateReportData({
      ...sample,
      queryType: 'help',
      helpCards: [
        {
          title: '全网速览',
          description: '看全网主线与榜单。',
          examples: ['/alpha 全网']
        }
      ]
    })
  );
  assert.match(output, /Alpha 可用功能/);
  assert.match(output, /全网速览/);
});

test('render help mode falls back when helpCards is empty', () => {
  const output = renderTg(validateReportData({ ...sample, queryType: 'help', helpCards: [] }));
  assert.match(output, /Alpha 可用功能/);
  assert.match(output, /衍生品开 \/ 衍生品关/);
});

test('render token card works for Base token with compact metrics in square', () => {
  const tokenData = validateReportData({
    title: '',
    queryType: 'token',
    tokenQuery: { symbol: 'AERO', chain: 'Base' },
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
      showExchangeHot: false,
      showWalletHot: false,
      showMemeRadar: true,
      showFuturesSentiment: true,
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
    fearGreedIndex: {},
    marketTheme: {},
    spotLeaderboards: { gainersTop3: [], losersTop3: [] },
    alphaLeaderboards: { volumeTop3: [], volumeTop3NoUsdsFutures: [] },
    futuresLeaderboards: { fundingTop3: [], gainersTop3WithFunding: [] },
    leaderboards: { exchangeHotTop3: [], walletHotTop3: [] },
    memeRadar: { summary: '', top3: [] },
    futuresSentiment: { summary: '', panels: [] },
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
          priceChange24h: '+6.2%',
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
  assert.match(output, /关键数据：价格：1\.82；24h涨跌：\+6\.2%；24h成交量：12\.2M；风险等级：LOW/);
  assert.doesNotMatch(output, /流动性：9\.4M/);
});

test('render token report supports multiple tokens', () => {
  const tokenData = validateReportData({
    ...sample,
    queryType: 'token',
    watchlist: [
      {
        symbol: 'ROBO',
        chain: 'Base',
        action: '看',
        score: 88,
        reason: 'first',
        metrics: { price: '$1' },
        risk: 'r1',
        next: 'n1'
      },
      {
        symbol: 'AURA',
        chain: 'Solana',
        action: '继续观察',
        score: 81,
        reason: 'second',
        metrics: { price: '$2' },
        risk: 'r2',
        next: 'n2'
      }
    ]
  });
  const output = renderReport(tokenData);
  assert.match(output, /## 1\. ROBO \[Base\]/);
  assert.match(output, /## 2\. AURA \[Solana\]/);
  assert.match(output, /### 关键指标/);
});

test('renderTg still shows spot sections when spot call fails', () => {
  const output = renderTg(
    validateReportData({
      ...sample,
      upstreamCalls: [
        { skill: 'spot', status: 'failed', message: 'mock fail' },
        { skill: 'alpha', status: 'ok' },
        { skill: 'derivatives-trading-usds-futures', status: 'ok' },
        { skill: 'meme-rush', status: 'ok' },
        { skill: 'query-token-info', status: 'ok' },
        { skill: 'trading-signal', status: 'ok' },
        { skill: 'query-token-audit', status: 'ok' }
      ],
      spotLeaderboards: { gainersTop3: [], losersTop3: [] }
    })
  );
  assert.match(output, /现货涨幅前三/);
  assert.match(output, /本轮未成功调用 `spot`/);
  assert.match(output, /现货跌幅前三/);
});

test('renderSquare still shows alpha section when alpha call fails', () => {
  const output = renderSquare(
    validateReportData({
      ...sample,
      upstreamCalls: [
        { skill: 'spot', status: 'ok' },
        { skill: 'alpha', status: 'failed', message: 'mock fail' },
        { skill: 'derivatives-trading-usds-futures', status: 'ok' },
        { skill: 'meme-rush', status: 'ok' }
      ],
      alphaLeaderboards: { volumeTop3: [], volumeTop3NoUsdsFutures: [] }
    })
  );
  assert.match(output, /Alpha 24h 成交量前 3/);
  assert.match(output, /本轮未成功调用 `alpha`/);
});

test('renderFuturesPanel shows open interest value in outputs', () => {
  const output = renderTg(validateReportData(sample));
  assert.match(output, /持仓 \$386,545,621/);
});
