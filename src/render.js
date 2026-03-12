'use strict';

function stringValue(value, fallback = '数据未提供') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function scoreValue(item) {
  return typeof item?.score === 'number' ? item.score : -1;
}

function sortWatchlist(items) {
  return [...ensureArray(items)].sort((a, b) => scoreValue(b) - scoreValue(a));
}

const SINGLE_SCOPE_LABELS = {
  solana: 'Solana',
  bsc: 'BSC',
  base: 'Base',
  ethereum: 'Ethereum',
  eth: 'ETH'
};

function defaultHelpCards() {
  return [
    {
      title: '全网速览',
      description: '看全网 24h 主线、现货涨跌榜、热度榜、钱包热度和 Meme 雷达。',
      examples: ['/alpha 全网', '/alpha global']
    },
    {
      title: '分链速览',
      description: '看 Solana / BSC / Base 单链视角。',
      examples: ['/alpha base', '/alpha bsc', '/alpha solana']
    },
    {
      title: '指定代币体检',
      description: '查某个币的价格、流动性、风险、信号与结论。',
      examples: ['/alpha 代币=ROBO', '查询ROBO的信息']
    },
    {
      title: '广场文案',
      description: '生成可直接发 Binance Square 的文案草稿。',
      examples: ['/alpha 全网 广场版 前3', '/alpha 全网 广场版 署名开 不再询问']
    },
    {
      title: '偏好设置',
      description: '控制显示模块和风格偏好。',
      examples: ['谨慎', '钱包关', '现货关', '热度开', '钱包热度关', 'meme开', '衍生品关']
    }
  ];
}

function scopeLabel(data) {
  const scope = String(data?.chainScope || '').trim().toLowerCase();
  const selectedChains = ensureArray(data?.selectedChains);

  if (scope === 'auto') {
    return selectedChains.length > 0 ? `Auto (${selectedChains.join(' / ')})` : 'Auto';
  }

  if (scope === 'global') {
    return selectedChains.length > 0 ? `Global (${selectedChains.join(' / ')})` : 'Global';
  }

  if (SINGLE_SCOPE_LABELS[scope]) {
    return SINGLE_SCOPE_LABELS[scope];
  }

  return stringValue(data?.chain || data?.chainScope || 'Unknown', 'Unknown');
}

function metricRows(metrics = {}) {
  return [
    ['价格', metrics.price],
    ['24h涨跌', metrics.priceChange24h],
    ['24h成交量', metrics.volume24h],
    ['流动性', metrics.liquidity],
    ['市值', metrics.marketCap],
    ['Holders', metrics.holders],
    ['Top10占比', metrics.top10Pct],
    ['Smart Money', metrics.smartMoney],
    ['风险等级', metrics.riskLevel],
    ['24h搜索', metrics.searchCount24h]
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function formatMetrics(metrics = {}) {
  const parts = metricRows(metrics).map(([label, value]) => `${label}：${value}`);
  return parts.length > 0 ? parts.join('；') : '关键数据未提供';
}

function formatMetricsCompact(metrics = {}) {
  const pairs = [
    ['价格', metrics.price],
    ['24h涨跌', metrics.priceChange24h],
    ['24h成交量', metrics.volume24h],
    ['风险等级', metrics.riskLevel]
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (pairs.length === 0) return '关键数据未提供';
  return pairs.map(([label, value]) => `${label}：${value}`).join('；');
}

function metricsTable(metrics = {}) {
  const rows = metricRows(metrics);

  if (rows.length === 0) {
    return ['关键数据未提供。'];
  }

  return [
    '| 指标 | 数值 |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| ${label} | ${String(value)} |`)
  ];
}

function failedUpstreamCalls(upstreamCalls = []) {
  return ensureArray(upstreamCalls).filter((call) => call?.status === 'failed');
}

function confidenceLabel(value) {
  if (value === 'high') return '高';
  if (value === 'low') return '低';
  return '中';
}

function severityLabel(value) {
  if (value === 'high') return '高';
  if (value === 'low') return '低';
  return '中';
}

function getTopN(data, fallback) {
  const value = data?.preferences && typeof data.preferences.topN === 'number' ? data.preferences.topN : fallback;
  return Math.max(1, Math.min(value, 10));
}

function getPrimaryToken(data) {
  const sorted = sortWatchlist(data?.watchlist);
  if (sorted.length > 0) return sorted[0];

  return {
    symbol: data?.tokenQuery?.symbol || data?.tokenQuery?.token || '未知代币',
    chain: data?.tokenQuery?.chain || data?.chain || '',
    contractAddress: data?.tokenQuery?.contractAddress || ''
  };
}

function getTokenItems(data) {
  const sorted = sortWatchlist(data?.watchlist);
  if (sorted.length > 0) return sorted;
  return [getPrimaryToken(data)];
}

function shouldShowFailureDetails(data, mode) {
  const failed = failedUpstreamCalls(data?.upstreamCalls);
  if (failed.length === 0) return false;
  if (mode === 'report') return true;
  if (ensureArray(data?.watchlist).length === 0) return true;
  return false;
}

function hasSuccessfulUpstreamCall(data, skillNames) {
  const names = Array.isArray(skillNames) ? skillNames : [skillNames];
  return ensureArray(data?.upstreamCalls).some(
    (call) => names.includes(call?.skill) && ['ok', 'partial'].includes(call?.status)
  );
}

function formatLeaderboardItem(item, defaultLabel) {
  const symbol = item?.symbol || item?.name || '未知代币';
  const chain = item?.chain ? ` [${item.chain}]` : '';
  const metricLabel = item?.metricLabel || defaultLabel || '';
  const metricValue = item?.metricValue !== undefined && item?.metricValue !== null && item?.metricValue !== '' ? item.metricValue : '';
  const note = item?.note ? `｜${item.note}` : '';

  if (metricLabel && metricValue) return `${symbol}${chain}｜${metricLabel} ${metricValue}${note}`;
  if (metricValue) return `${symbol}${chain}｜${metricValue}${note}`;
  return `${symbol}${chain}${note}`;
}

function renderRequiredList(title, items, metricLabel, fallbackText, limit = 3) {
  const lines = [`${title}：`];
  const list = ensureArray(items);

  if (list.length === 0) {
    lines.push(`- ${fallbackText}`);
    return lines;
  }

  list.slice(0, limit).forEach((item) => {
    lines.push(`- ${formatLeaderboardItem(item, metricLabel)}`);
  });

  return lines;
}

function renderMemeRadarLines(memeRadar = {}, fallbackText = '暂无 Meme 雷达数据', options = {}) {
  const { inlineLabel = true, maxItems = 3 } = options;
  const lines = [];
  const summary = memeRadar?.summary || '今日最热 meme 观察';
  const items = ensureArray(memeRadar?.top3);

  lines.push(inlineLabel ? `Meme 雷达：${summary}` : summary);

  if (items.length === 0) {
    lines.push(`- ${fallbackText}`);
    return lines;
  }

  items.slice(0, maxItems).forEach((item) => {
    const symbol = item?.symbol || item?.name || '未知代币';
    const chain = item?.chain ? ` [${item.chain}]` : '';
    const reason = item?.reason || item?.note || '暂无补充';
    lines.push(`- ${symbol}${chain}｜${reason}`);
  });

  return lines;
}

function isFailedFuturesPanel(panel) {
  return String(panel?.stance || '').startsWith('获取失败');
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const fixed = Number.isInteger(num)
    ? String(num)
    : num.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return `${num > 0 ? '+' : ''}${fixed}%`;
}

function formatReadableDollar(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(value);
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

function formatFuturesPanel(panel) {
  const symbol = panel?.symbol || '未知合约';
  const parts = [];

  if (panel?.stance) parts.push(panel.stance);
  if (panel?.topLongShortRatio !== null && panel?.topLongShortRatio !== undefined) {
    parts.push(`大户多空 ${panel.topLongShortRatio}`);
  }
  if (panel?.globalLongShortRatio !== null && panel?.globalLongShortRatio !== undefined) {
    parts.push(`全市场多空 ${panel.globalLongShortRatio}`);
  }
  if (panel?.openInterestValue !== null && panel?.openInterestValue !== undefined && panel?.openInterestValue !== '') {
    parts.push(`持仓 ${formatReadableDollar(panel.openInterestValue)}`);
  }
  if (panel?.openInterestChangePct !== null && panel?.openInterestChangePct !== undefined) {
    parts.push(`OI ${formatSignedPercent(panel.openInterestChangePct)}`);
  }
  if (panel?.fundingRate !== null && panel?.fundingRate !== undefined) {
    parts.push(`费率 ${panel.fundingRate}`);
  }
  if (panel?.takerBuySellRatio !== null && panel?.takerBuySellRatio !== undefined) {
    parts.push(`主动买卖 ${panel.takerBuySellRatio}`);
  }

  return `${symbol}｜${parts.join('｜') || '暂无关键指标'}`;
}

function hasFuturesSentimentData(data) {
  return Boolean(data?.futuresSentiment?.summary) || ensureArray(data?.futuresSentiment?.panels).length > 0;
}

function renderFuturesSentimentLines(
  futuresSentiment = {},
  fallbackText = '暂无衍生品情绪数据',
  options = {}
) {
  const { inlineLabel = true, maxPanels = 3 } = options;
  const lines = [];
  const panels = ensureArray(futuresSentiment?.panels);
  const validPanels = panels.filter((panel) => !isFailedFuturesPanel(panel));
  const failedCount = panels.length - validPanels.length;
  const summary = futuresSentiment?.summary || fallbackText;

  lines.push(inlineLabel ? `衍生品情绪：${summary}` : summary);

  if (validPanels.length === 0) {
    if (failedCount > 0) {
      lines.push(`- ${failedCount} 个衍生品面板未成功获取`);
    }
    return lines;
  }

  validPanels.slice(0, maxPanels).forEach((panel) => {
    lines.push(`- ${formatFuturesPanel(panel)}`);
  });

  if (failedCount > 0) {
    lines.push(`- 其余 ${failedCount} 个衍生品面板未成功获取`);
  }

  return lines;
}

function hasWalletAppendix(data) {
  return Boolean(data?.walletAppendix?.summary) || ensureArray(data?.walletAppendix?.notes).length > 0;
}

function renderWalletAppendixLines(walletAppendix = {}) {
  const lines = [];

  if (walletAppendix?.summary) {
    lines.push(walletAppendix.summary);
  }

  const notes = ensureArray(walletAppendix?.notes);
  if (notes.length === 0 && lines.length === 0) {
    return ['暂无聪明钱附录。'];
  }

  notes.forEach((note) => lines.push(`- ${note}`));
  return lines;
}

function compactSentence(value) {
  return String(value || '').trim().replace(/[。；;，,]+$/u, '');
}

function summarizeConclusionText(conclusion, limit = 2, fallback = '数据不足，暂不下结论。') {
  const parts = ensureArray(conclusion)
    .slice(0, limit)
    .map((item) => compactSentence(item))
    .filter(Boolean);

  return parts.length > 0 ? parts.join('；') : fallback;
}

function renderConclusionLines(conclusion, fallbackText = '数据不足，暂不下结论。') {
  const lines = [];
  const items = ensureArray(conclusion);

  if (items.length === 0) {
    lines.push(`- ${fallbackText}`);
    return lines;
  }

  items.forEach((item) => lines.push(`- ${item}`));
  return lines;
}

function renderUpstreamFailureLines(data) {
  return failedUpstreamCalls(data?.upstreamCalls).map(
    (call) => `- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`
  );
}

function renderMarketThemeLines(marketTheme = {}) {
  const lines = [stringValue(marketTheme?.summary, '数据不足，暂不下结论。')];
  ensureArray(marketTheme?.signals).forEach((signal) => lines.push(`- ${signal}`));
  if (marketTheme?.stance) {
    lines.push(`结论倾向：${marketTheme.stance}`);
  }
  return lines;
}

function appendSection(lines, title, contentLines) {
  if (!ensureArray(contentLines).length) return;
  lines.push(title);
  ensureArray(contentLines).forEach((line) => lines.push(line));
  lines.push('');
}

function renderHelp(data) {
  const lines = [];
  const cards = ensureArray(data?.helpCards).length > 0 ? ensureArray(data?.helpCards) : defaultHelpCards();

  lines.push('Alpha 可用功能');
  lines.push('');
  lines.push('你可以这样用：');
  lines.push('');

  cards.forEach((card, idx) => {
    lines.push(`${idx + 1}. ${card.title}`);
    lines.push(`   ${card.description}`);
    ensureArray(card.examples).forEach((example) => {
      lines.push(`   - ${example}`);
    });
    lines.push('');
  });

  lines.push('可调偏好：');
  lines.push('- 谨慎 / 均衡 / 激进');
  lines.push('- 钱包开 / 钱包关');
  lines.push('- 现货开 / 现货关');
  lines.push('- 热度开 / 热度关');
  lines.push('- 钱包热度开 / 钱包热度关');
  lines.push('- meme开 / meme关');
  lines.push('- 衍生品开 / 衍生品关');
  lines.push('- 署名开 / 署名关');
  lines.push('- 每次询问 / 不再询问');
  lines.push('');
  lines.push('快速开始：');
  lines.push('- /alpha 全网');
  lines.push('- /alpha base');
  lines.push('- /alpha 代币=ROBO');
  lines.push('- /alpha 全网 广场版 前3');
  lines.push('- 查询ROBO的信息');

  return `${lines.join('\n').trim()}\n`;
}

function renderMarketTg(data) {
  const lines = [];
  const label = scopeLabel(data);
  const topItems = sortWatchlist(data?.watchlist).slice(0, getTopN(data, 3));
  const topRisks = ensureArray(data?.riskAlerts).slice(0, 2);

  const spotReady = hasSuccessfulUpstreamCall(data, ['spot', 'spot-public-api']);
  const rankReady = hasSuccessfulUpstreamCall(data, ['crypto-market-rank']);
  const memeReady = hasSuccessfulUpstreamCall(data, ['meme-rush']);
  const futuresReady = hasSuccessfulUpstreamCall(data, ['trading-signal', 'futures-public-api']);

  lines.push(`📊 Alpha Radar｜${label} ${stringValue(data?.window, '24h')} 预览`);
  lines.push(`主线一句话：${stringValue(data?.marketTheme?.summary, '数据不足，暂不下结论。')}`);

  const spotGainers =
    data?.preferences?.showSpotLeaderboards === false
      ? []
      : renderRequiredList(
          '现货涨幅前三',
          data?.spotLeaderboards?.gainersTop3,
          '涨幅',
          spotReady ? '暂无现货涨幅数据' : '本轮未成功调用 `spot`'
        );

  const spotLosers =
    data?.preferences?.showSpotLeaderboards === false
      ? []
      : renderRequiredList(
          '现货跌幅前三',
          data?.spotLeaderboards?.losersTop3,
          '跌幅',
          spotReady ? '暂无现货跌幅数据' : '本轮未成功调用 `spot`'
        );

  const futuresSentiment =
    data?.preferences?.showFuturesSentiment === false || !(hasFuturesSentimentData(data) || futuresReady)
      ? []
      : renderFuturesSentimentLines(
          data?.futuresSentiment || {},
          futuresReady ? '暂无衍生品情绪数据' : '本轮未成功调用 `trading-signal`',
          { inlineLabel: true, maxPanels: 3 }
        );

  const exchangeHot =
    data?.preferences?.showExchangeHot === false
      ? []
      : renderRequiredList(
          '交易所热度前三',
          data?.leaderboards?.exchangeHotTop3,
          '热度',
          rankReady ? '暂无交易所热度数据' : '本轮未成功调用 `crypto-market-rank`'
        );

  const walletHot =
    data?.preferences?.showWalletHot === false
      ? []
      : renderRequiredList(
          '钱包热度前三',
          data?.leaderboards?.walletHotTop3,
          '热度',
          rankReady ? '暂无钱包热度数据' : '本轮未成功调用 `crypto-market-rank`'
        );

  const memeRadar =
    data?.preferences?.showMemeRadar === false
      ? []
      : renderMemeRadarLines(
          data?.memeRadar || {},
          memeReady ? '暂无 Meme 雷达数据' : '本轮未成功调用 `meme-rush`',
          { inlineLabel: true, maxItems: 3 }
        );

  [spotGainers, spotLosers, futuresSentiment, exchangeHot, walletHot, memeRadar].forEach((section) => {
    if (section.length) {
      lines.push('');
      lines.push(...section);
    }
  });

  lines.push('');
  lines.push('值得看：');
  if (topItems.length === 0) {
    lines.push('- 暂无明确入选标的');
  } else {
    topItems.forEach((item) => {
      const symbol = item?.symbol || item?.name || '未知代币';
      const chain = item?.chain ? ` [${item.chain}]` : '';
      const score = typeof item?.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item?.action || item?.verdict || '观察';
      const confidence = confidenceLabel(item?.confidence || 'medium');
      const sources = ensureArray(item?.sourceFlags);
      const sourceText = sources.length > 0 ? `｜来源：${sources.join(' / ')}` : '';
      lines.push(`- ${symbol}${chain}｜${action}｜${score}｜置信度${confidence}${sourceText}`);
      lines.push(`  ${stringValue(item?.reason, '数据不足，暂不下结论。')}`);
    });
  }

  lines.push('');
  lines.push('风险：');
  if (topRisks.length === 0) {
    lines.push('- 今日未发现需要单独高亮的风险样本');
  } else {
    topRisks.forEach((risk) => {
      const symbol = risk?.symbol || risk?.name || '未知代币';
      const chain = risk?.chain ? ` [${risk.chain}]` : '';
      const severity = severityLabel(risk?.severity || 'medium');
      lines.push(`- ${symbol}${chain}｜${severity}｜${stringValue(risk?.reason, '存在风险')}`);
      const flags = ensureArray(risk?.flags);
      if (flags.length > 0) {
        lines.push(`  标签：${flags.join('；')}`);
      }
    });
  }

  if (shouldShowFailureDetails(data, 'tg')) {
    lines.push('');
    lines.push(...renderUpstreamFailureLines(data));
  }

  lines.push('');
  lines.push('结论：');
  lines.push(...renderConclusionLines(ensureArray(data?.conclusion).slice(0, 3)));
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderTokenTg(data) {
  const lines = [];
  const token = getPrimaryToken(data);
  const symbol = token?.symbol || token?.name || '未知代币';
  const chain = token?.chain ? ` [${token.chain}]` : '';
  const score = typeof token?.score === 'number' ? `${token.score}/100` : '未评分';
  const action = token?.action || token?.verdict || '观察';

  lines.push(`📊 Alpha Radar｜${symbol}${chain} ${stringValue(data?.window, '24h')} 预览`);
  lines.push(`结论：${action}｜${score}`);
  lines.push(`看点：${stringValue(token?.reason, '暂未获得充分结论。')}`);
  lines.push(`关键数据：${formatMetrics(token?.metrics || {})}`);
  lines.push(`风险：${stringValue(token?.risk, '未见单独高亮风险。')}`);
  lines.push(`下一步：${stringValue(token?.next, '继续观察资金、成交与风险是否共振。')}`);

  if (shouldShowFailureDetails(data, 'tg')) {
    lines.push('');
    lines.push(...renderUpstreamFailureLines(data));
  }

  lines.push('');
  renderConclusionLines(ensureArray(data?.conclusion).slice(0, 2)).forEach((line) => lines.push(line));
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderSingleTokenReportBlock(lines, token, index, total) {
  const symbol = token?.symbol || token?.name || '未知代币';
  const chain = token?.chain ? ` [${token.chain}]` : '';
  const score = typeof token?.score === 'number' ? `${token.score}/100` : '未评分';
  const action = token?.action || token?.verdict || '观察';
  const sources = ensureArray(token?.sourceFlags);

  if (total > 1) {
    lines.push(`## ${index + 1}. ${symbol}${chain}`);
  } else {
    lines.push('## 代币概览');
  }
  lines.push(`标的：${symbol}${chain}`);
  if (token?.contractAddress) lines.push(`合约：${token.contractAddress}`);
  lines.push(`结论：${action}｜${score}`);
  lines.push(`看点：${stringValue(token?.reason, '暂未获得充分结论。')}`);
  if (sources.length > 0) lines.push(`信号来源：${sources.join(' / ')}`);
  lines.push('');

  lines.push(total > 1 ? '### 关键指标' : '## 关键指标');
  metricsTable(token?.metrics || {}).forEach((line) => lines.push(line));
  lines.push('');

  lines.push(total > 1 ? '### 风险分析' : '## 风险分析');
  lines.push(stringValue(token?.risk, '未见单独高亮风险。'));
  lines.push('');

  lines.push(total > 1 ? '### 下一步观察' : '## 下一步观察');
  lines.push(stringValue(token?.next, '继续观察资金、成交与风险是否共振。'));
  lines.push('');
}

function renderTokenReport(data) {
  const lines = [];
  const tokenItems = getTokenItems(data);

  lines.push(`# ${data?.title || `Alpha Radar | Token | ${stringValue(data?.window, '24h')}`}`);
  if (data?.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push('');

  tokenItems.forEach((token, index) => {
    renderSingleTokenReportBlock(lines, token, index, tokenItems.length);
  });

  if (shouldShowFailureDetails(data, 'report')) {
    appendSection(lines, '## 上游失败', renderUpstreamFailureLines(data));
  }

  appendSection(lines, '## 结论', renderConclusionLines(data?.conclusion));
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderMarketReport(data) {
  const label = scopeLabel(data);
  const sorted = sortWatchlist(data?.watchlist);
  const lines = [];

  const spotReady = hasSuccessfulUpstreamCall(data, ['spot', 'spot-public-api']);
  const rankReady = hasSuccessfulUpstreamCall(data, ['crypto-market-rank']);
  const memeReady = hasSuccessfulUpstreamCall(data, ['meme-rush']);
  const futuresReady = hasSuccessfulUpstreamCall(data, ['trading-signal', 'futures-public-api']);

  lines.push(`# ${data?.title || `Alpha Radar | ${label} | ${stringValue(data?.window, '24h')}`}`);
  if (data?.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push(`范围：${label}`);
  lines.push('');

  appendSection(lines, '## 今日市场主线', renderMarketThemeLines(data?.marketTheme || {}));

  if (data?.preferences?.showSpotLeaderboards !== false) {
    appendSection(
      lines,
      '## 现货涨幅前三',
      renderRequiredList(
        '现货涨幅前三',
        data?.spotLeaderboards?.gainersTop3,
        '涨幅',
        spotReady ? '暂无现货涨幅数据' : '本轮未成功调用 `spot`'
      ).slice(1)
    );

    appendSection(
      lines,
      '## 现货跌幅前三',
      renderRequiredList(
        '现货跌幅前三',
        data?.spotLeaderboards?.losersTop3,
        '跌幅',
        spotReady ? '暂无现货跌幅数据' : '本轮未成功调用 `spot`'
      ).slice(1)
    );
  }

  if (data?.preferences?.showFuturesSentiment !== false && (hasFuturesSentimentData(data) || futuresReady)) {
    appendSection(
      lines,
      '## 衍生品情绪',
      renderFuturesSentimentLines(
        data?.futuresSentiment || {},
        futuresReady ? '暂无衍生品情绪数据' : '本轮未成功调用 `trading-signal`',
        { inlineLabel: false, maxPanels: 3 }
      )
    );
  }

  if (data?.preferences?.showExchangeHot !== false) {
    appendSection(
      lines,
      '## 交易所热度前三',
      renderRequiredList(
        '交易所热度前三',
        data?.leaderboards?.exchangeHotTop3,
        '热度',
        rankReady ? '暂无交易所热度数据' : '本轮未成功调用 `crypto-market-rank`'
      ).slice(1)
    );
  }

  if (data?.preferences?.showWalletHot !== false) {
    appendSection(
      lines,
      '## 钱包热度前三',
      renderRequiredList(
        '钱包热度前三',
        data?.leaderboards?.walletHotTop3,
        '热度',
        rankReady ? '暂无钱包热度数据' : '本轮未成功调用 `crypto-market-rank`'
      ).slice(1)
    );
  }

  if (data?.preferences?.showMemeRadar !== false) {
    appendSection(
      lines,
      '## Meme 雷达',
      renderMemeRadarLines(
        data?.memeRadar || {},
        memeReady ? '暂无 Meme 雷达数据' : '本轮未成功调用 `meme-rush`',
        { inlineLabel: false, maxItems: 3 }
      )
    );
  }

  const watchlistLines = [];
  if (sorted.length === 0) {
    watchlistLines.push('暂无明确入选标的。');
  } else {
    sorted.slice(0, getTopN(data, 5)).forEach((item, index) => {
      const symbol = item?.symbol || item?.name || '未知代币';
      const chain = item?.chain ? ` [${item.chain}]` : '';
      const score = typeof item?.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item?.action || item?.verdict || '观察';
      const sources = ensureArray(item?.sourceFlags);

      watchlistLines.push(`### ${index + 1}. ${symbol}${chain}｜${action}｜${score}`);
      watchlistLines.push(`理由：${stringValue(item?.reason, '数据不足，暂不下结论。')}`);
      if (sources.length > 0) {
        watchlistLines.push(`来源：${sources.join(' / ')}`);
      }
      watchlistLines.push('关键指标：');
      metricsTable(item?.metrics || {}).forEach((line) => watchlistLines.push(line));
      if (item?.next) {
        watchlistLines.push(`下一步：${item.next}`);
      }
      watchlistLines.push('');
    });
  }
  appendSection(lines, '## 值得看 Top', watchlistLines);

  if (data?.preferences?.wallet !== false && hasWalletAppendix(data)) {
    appendSection(lines, '## 钱包附录', renderWalletAppendixLines(data?.walletAppendix || {}));
  }

  const riskAlerts = ensureArray(data?.riskAlerts);
  const riskLines = [];
  if (riskAlerts.length === 0) {
    riskLines.push('暂无高亮风险。');
  } else {
    riskAlerts.forEach((risk) => {
      const symbol = risk?.symbol || risk?.name || '未知代币';
      const chain = risk?.chain ? ` [${risk.chain}]` : '';
      const flags = ensureArray(risk?.flags);
      riskLines.push(`- ${symbol}${chain}｜${severityLabel(risk?.severity || 'medium')}｜${stringValue(risk?.reason, '存在风险')}`);
      if (flags.length > 0) {
        riskLines.push(`  风险项：${flags.join('；')}`);
      }
    });
  }
  appendSection(lines, '## 风险', riskLines);

  if (shouldShowFailureDetails(data, 'report')) {
    appendSection(lines, '## 上游失败', renderUpstreamFailureLines(data));
  }

  appendSection(lines, '## 结论', renderConclusionLines(data?.conclusion));
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function countCharacters(text) {
  return String(text || '').trimEnd().length;
}

function finalizeSquareContent(lines, data) {
  const body = `${lines.join('\n').trim()}\n`;
  if (data?.previewOnly === false) {
    return body;
  }

  const count = countCharacters(body);
  return `${body.trimEnd()}\n字数统计：${count}字\n`;
}

function renderSquare(data) {
  const lines = [];

  if (data?.preferences?.squareDisclosureEnabled) {
    lines.push('本文由OpenClaw发出');
    lines.push('');
  }

  if (data?.queryType === 'help') {
    lines.push(renderHelp(data).trim());
    return finalizeSquareContent(lines, data);
  }

  if (data?.queryType === 'token') {
    const token = getPrimaryToken(data);
    const symbol = token?.symbol || token?.name || '未知代币';
    const chain = token?.chain ? ` [${token.chain}]` : '';
    const score = typeof token?.score === 'number' ? `${token.score}/100` : '未评分';
    const action = token?.action || token?.verdict || '观察';
    const conclusionSummary = summarizeConclusionText(data?.conclusion, 2, '');

    lines.push(`Alpha Radar｜${symbol}${chain} ${stringValue(data?.window, '24h')} 预览`);
    lines.push('');
    lines.push(`结论：${action}｜${score}`);
    lines.push(`看点：${stringValue(token?.reason, '暂未获得充分结论。')}`);
    lines.push(`关键数据：${formatMetricsCompact(token?.metrics || {})}`);
    lines.push(`风险：${stringValue(token?.risk, '未见单独高亮风险。')}`);
    lines.push(`下一步：${stringValue(token?.next, '继续观察资金、成交与风险是否共振。')}`);
    if (conclusionSummary) {
      lines.push(`补充结论：${conclusionSummary}`);
    }
    lines.push('DYOR。以上仅为研究整理，不构成任何建议。');
    return finalizeSquareContent(lines, data);
  }

  const label = scopeLabel(data);
  const topItems = sortWatchlist(data?.watchlist).slice(0, Math.min(getTopN(data, 3), 3));
  const topRisks = ensureArray(data?.riskAlerts).slice(0, 2);

  const spotReady = hasSuccessfulUpstreamCall(data, ['spot', 'spot-public-api']);
  const rankReady = hasSuccessfulUpstreamCall(data, ['crypto-market-rank']);
  const memeReady = hasSuccessfulUpstreamCall(data, ['meme-rush']);
  const futuresReady = hasSuccessfulUpstreamCall(data, ['trading-signal', 'futures-public-api']);

  lines.push(`Alpha Radar｜${label} ${stringValue(data?.window, '24h')} 预览`);
  lines.push('');
  lines.push(`主线：${stringValue(data?.marketTheme?.summary, '今日主线暂不明确。')}`);

  const sections = [
    data?.preferences?.showSpotLeaderboards === false
      ? []
      : renderRequiredList(
          '现货涨幅前三',
          data?.spotLeaderboards?.gainersTop3,
          '涨幅',
          spotReady ? '暂无现货涨幅数据' : '本轮未成功调用 `spot`'
        ),
    data?.preferences?.showSpotLeaderboards === false
      ? []
      : renderRequiredList(
          '现货跌幅前三',
          data?.spotLeaderboards?.losersTop3,
          '跌幅',
          spotReady ? '暂无现货跌幅数据' : '本轮未成功调用 `spot`'
        ),
    data?.preferences?.showFuturesSentiment === false || !(hasFuturesSentimentData(data) || futuresReady)
      ? []
      : renderFuturesSentimentLines(
          data?.futuresSentiment || {},
          futuresReady ? '暂无衍生品情绪数据' : '本轮未成功调用 `trading-signal`',
          { inlineLabel: true, maxPanels: 2 }
        ),
    data?.preferences?.showExchangeHot === false
      ? []
      : renderRequiredList(
          '交易所热度前三',
          data?.leaderboards?.exchangeHotTop3,
          '热度',
          rankReady ? '暂无交易所热度数据' : '本轮未成功调用 `crypto-market-rank`'
        ),
    data?.preferences?.showWalletHot === false
      ? []
      : renderRequiredList(
          '钱包热度前三',
          data?.leaderboards?.walletHotTop3,
          '热度',
          rankReady ? '暂无钱包热度数据' : '本轮未成功调用 `crypto-market-rank`'
        ),
    data?.preferences?.showMemeRadar === false
      ? []
      : renderMemeRadarLines(
          data?.memeRadar || {},
          memeReady ? '暂无 Meme 雷达数据' : '本轮未成功调用 `meme-rush`',
          { inlineLabel: true, maxItems: 2 }
        )
  ];

  sections.forEach((section) => {
    if (section.length) {
      lines.push('');
      lines.push(...section);
    }
  });

  lines.push('');
  lines.push('值得看：');
  if (topItems.length === 0) {
    lines.push('1. 今日暂无明确入选标的');
  } else {
    topItems.forEach((item, index) => {
      const symbol = item?.symbol || item?.name || '未知代币';
      const chain = item?.chain ? ` [${item.chain}]` : '';
      const score = typeof item?.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item?.action || item?.verdict || '观察';
      lines.push(`${index + 1}. ${symbol}${chain}｜${action}｜${score}`);
      lines.push(`↳ ${stringValue(item?.reason, '数据不足，暂不下结论。')}`);
    });
  }

  lines.push('');
  lines.push('风险：');
  if (topRisks.length === 0) {
    lines.push('- 暂无单独高亮风险样本');
  } else {
    topRisks.forEach((risk) => {
      const symbol = risk?.symbol || risk?.name || '未知代币';
      const chain = risk?.chain ? ` [${risk.chain}]` : '';
      lines.push(`- ${symbol}${chain}：${stringValue(risk?.reason, '存在风险')}`);
    });
  }

  lines.push('');
  const conclusionSummary = summarizeConclusionText(data?.conclusion, 2, '数据不足，暂不下结论。');
  lines.push(`结论：${conclusionSummary}`);
  lines.push('DYOR。以上仅为研究整理，不构成任何建议。');

  return finalizeSquareContent(lines, data);
}

function renderReport(data) {
  if (data?.queryType === 'help') {
    return renderHelp(data);
  }

  if (data?.queryType === 'token') {
    return renderTokenReport(data);
  }

  return renderMarketReport(data);
}

function renderTg(data) {
  if (data?.queryType === 'help') return renderHelp(data);
  if (data?.queryType === 'token') return renderTokenTg(data);
  return renderMarketTg(data);
}

module.exports = {
  renderTg,
  renderReport,
  renderSquare,
  renderHelp,
  defaultHelpCards,
  formatMetrics,
  formatMetricsCompact,
  metricsTable,
  stringValue,
  scopeLabel,
  renderRequiredList,
  renderMemeRadarLines,
  renderFuturesSentimentLines,
  finalizeSquareContent,
  summarizeConclusionText,
  formatFuturesPanel,
  formatReadableDollar
};
