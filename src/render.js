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
  return typeof item.score === 'number' ? item.score : -1;
}

function sortWatchlist(items) {
  return [...ensureArray(items)].sort((a, b) => scoreValue(b) - scoreValue(a));
}

function scopeLabel(data) {
  const scope = (data.chainScope || '').toLowerCase();
  const selectedChains = ensureArray(data.selectedChains);

  if (scope === 'auto') {
    return selectedChains.length > 0 ? `Auto (${selectedChains.join(' / ')})` : 'Auto';
  }

  if (scope === 'global') {
    return selectedChains.length > 0 ? `Global (${selectedChains.join(' / ')})` : 'Global';
  }

  if (scope === 'ethereum') return 'Ethereum';
  if (scope === 'eth') return 'ETH';
  if (scope === 'base') return 'Base';

  return stringValue(data.chain || data.chainScope || 'Unknown', 'Unknown');
}

function formatMetrics(metrics = {}) {
  const pairs = [
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
  ];

  const parts = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}：${value}`);

  return parts.length > 0 ? parts.join('；') : '关键数据未提供';
}

function failedUpstreamCalls(upstreamCalls = []) {
  return ensureArray(upstreamCalls).filter((call) => call.status === 'failed');
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
  const value = data.preferences && typeof data.preferences.topN === 'number' ? data.preferences.topN : fallback;
  return Math.max(1, Math.min(value, 10));
}

function getPrimaryToken(data) {
  const sorted = sortWatchlist(data.watchlist);
  if (sorted.length > 0) return sorted[0];

  return {
    symbol: data.tokenQuery?.symbol || data.tokenQuery?.token || '未知代币',
    chain: data.tokenQuery?.chain || data.chain || '',
    contractAddress: data.tokenQuery?.contractAddress || ''
  };
}

function shouldShowFailureDetails(data, mode) {
  const failed = failedUpstreamCalls(data.upstreamCalls);
  if (failed.length === 0) return false;
  if (mode === 'report') return true;
  if (ensureArray(data.watchlist).length === 0) return true;
  return false;
}

function formatLeaderboardItem(item, defaultLabel) {
  const symbol = item.symbol || item.name || '未知代币';
  const chain = item.chain ? ` [${item.chain}]` : '';
  const metricLabel = item.metricLabel || defaultLabel || '';
  const metricValue = item.metricValue !== undefined && item.metricValue !== null && item.metricValue !== '' ? item.metricValue : '';
  const note = item.note ? `｜${item.note}` : '';

  if (metricLabel && metricValue) return `${symbol}${chain}｜${metricLabel} ${metricValue}${note}`;
  if (metricValue) return `${symbol}${chain}｜${metricValue}${note}`;
  return `${symbol}${chain}${note}`;
}

function renderSimpleList(title, items, metricLabel) {
  const list = ensureArray(items);
  const lines = [];
  if (list.length === 0) return lines;

  lines.push(`${title}：`);
  list.slice(0, 3).forEach((item, idx) => {
    lines.push(`- ${idx + 1}. ${formatLeaderboardItem(item, metricLabel)}`);
  });
  return lines;
}

function renderMemeRadarBlock(memeRadar = {}) {
  const lines = [];
  const items = ensureArray(memeRadar.top3);
  if (items.length === 0) return lines;

  lines.push(`Meme 雷达：${memeRadar.summary || '今日最热 meme 观察'}`);
  items.slice(0, 3).forEach((item, idx) => {
    const symbol = item.symbol || item.name || '未知代币';
    const chain = item.chain ? ` [${item.chain}]` : '';
    const reason = item.reason || item.note || '暂无补充';
    lines.push(`- ${idx + 1}. ${symbol}${chain}｜${reason}`);
  });
  return lines;
}

function renderHelp(data) {
  const lines = [];

  lines.push('📊 Alpha 可用功能');
  lines.push('');
  lines.push('你可以这样用：');
  lines.push('');

  ensureArray(data.helpCards).forEach((card, idx) => {
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
  const topItems = sortWatchlist(data.watchlist).slice(0, getTopN(data, 3));
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);

  lines.push(`📊 Alpha Radar｜${label} ${stringValue(data.window, '24h')} 预览`);
  lines.push(`主线一句话：${stringValue(data.marketTheme.summary, '数据不足，暂不下结论。')}`);

  const spotGainers =
    data.preferences?.showSpotLeaderboards === false ? [] : renderSimpleList('现货涨幅前三', data.spotLeaderboards?.gainersTop3, '涨幅');

  const spotLosers =
    data.preferences?.showSpotLeaderboards === false ? [] : renderSimpleList('现货跌幅前三', data.spotLeaderboards?.losersTop3, '跌幅');

  const exchangeHot =
    data.preferences?.showExchangeHot === false ? [] : renderSimpleList('交易所热度前三', data.leaderboards?.exchangeHotTop3, '热度');

  const walletHot =
    data.preferences?.showWalletHot === false ? [] : renderSimpleList('钱包热度前三', data.leaderboards?.walletHotTop3, '热度');

  const memeRadar =
    data.preferences?.showMemeRadar === false ? [] : renderMemeRadarBlock(data.memeRadar || {});

  if (spotGainers.length) {
    lines.push('');
    lines.push(...spotGainers);
  }
  if (spotLosers.length) {
    lines.push('');
    lines.push(...spotLosers);
  }
  if (exchangeHot.length) {
    lines.push('');
    lines.push(...exchangeHot);
  }
  if (walletHot.length) {
    lines.push('');
    lines.push(...walletHot);
  }
  if (memeRadar.length) {
    lines.push('');
    lines.push(...memeRadar);
  }

  lines.push('');
  lines.push('值得看：');
  if (topItems.length === 0) {
    lines.push('- 暂无明确入选标的');
  } else {
    for (const item of topItems) {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? ` [${item.chain}]` : '';
      const score = typeof item.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item.action || item.verdict || '观察';
      const confidence = confidenceLabel(item.confidence || 'medium');
      lines.push(`- ${symbol}${chain}｜${action}｜${score}｜置信度${confidence}`);
      lines.push(`  ${stringValue(item.reason, '数据不足，暂不下结论。')}`);
    }
  }

  lines.push('');
  lines.push('风险：');
  if (topRisks.length === 0) {
    lines.push('- 今日未发现需要单独高亮的风险样本');
  } else {
    for (const risk of topRisks) {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? ` [${risk.chain}]` : '';
      const severity = severityLabel(risk.severity || 'medium');
      lines.push(`- ${symbol}${chain}｜${severity}｜${stringValue(risk.reason, '存在风险')}`);
    }
  }

  if (shouldShowFailureDetails(data, 'tg')) {
    lines.push('');
    for (const call of failedUpstreamCalls(data.upstreamCalls)) {
      lines.push(`- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`);
    }
  }

  lines.push('');
  lines.push('结论：');
  const conclusion = ensureArray(data.conclusion).slice(0, 3);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of conclusion) {
      lines.push(`- ${item}`);
    }
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderTokenTg(data) {
  const lines = [];
  const token = getPrimaryToken(data);
  const symbol = token.symbol || token.name || '未知代币';
  const chain = token.chain ? ` [${token.chain}]` : '';
  const score = typeof token.score === 'number' ? `${token.score}/100` : '未评分';
  const action = token.action || token.verdict || '观察';

  lines.push(`📊 Alpha Radar｜${symbol}${chain} ${stringValue(data.window, '24h')} 预览`);
  lines.push(`结论：${action}｜${score}`);
  lines.push(`看点：${stringValue(token.reason, '暂未获得充分结论。')}`);
  lines.push(`关键数据：${formatMetrics(token.metrics || {})}`);
  lines.push(`风险：${stringValue(token.risk, '未见单独高亮风险。')}`);
  lines.push(`下一步：${stringValue(token.next, '继续观察资金、成交与风险是否共振。')}`);

  if (shouldShowFailureDetails(data, 'tg')) {
    lines.push('');
    for (const call of failedUpstreamCalls(data.upstreamCalls)) {
      lines.push(`- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`);
    }
  }

  lines.push('');
  const conclusion = ensureArray(data.conclusion).slice(0, 2);
  if (conclusion.length > 0) {
    for (const item of conclusion) lines.push(`- ${item}`);
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderReport(data) {
  if (data.queryType === 'help') {
    return renderHelp(data);
  }

  const label = scopeLabel(data);
  const sorted = sortWatchlist(data.watchlist);
  const lines = [];

  if (data.queryType === 'token') {
    const token = getPrimaryToken(data);
    const symbol = token.symbol || token.name || '未知代币';
    const chain = token.chain ? ` [${token.chain}]` : '';
    lines.push(`# ${data.title || `Alpha Radar | ${symbol}${chain} | ${stringValue(data.window, '24h')}`}`);
    lines.push(`结论：${token.action || token.verdict || '观察'}${typeof token.score === 'number' ? `｜${token.score}/100` : ''}`);
    lines.push(`看点：${stringValue(token.reason, '暂未获得充分结论。')}`);
    lines.push(`关键数据：${formatMetrics(token.metrics || {})}`);
    lines.push(`风险：${stringValue(token.risk, '未见单独高亮风险。')}`);
    lines.push(`下一步：${stringValue(token.next, '继续观察资金、成交与风险是否共振。')}`);
    lines.push('');
    const conclusion = ensureArray(data.conclusion);
    if (conclusion.length > 0) {
      conclusion.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
    return `${lines.join('\n').trim()}\n`;
  }

  lines.push(`# ${data.title || `Alpha Radar | ${label} | ${stringValue(data.window, '24h')}`}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push(`范围：${label}`);
  lines.push('');

  lines.push('## 今日市场主线');
  lines.push(stringValue(data.marketTheme.summary, '数据不足，暂不下结论。'));
  lines.push('');

  lines.push('## 现货涨幅前三');
  const gainers = renderSimpleList('', data.spotLeaderboards?.gainersTop3, '涨幅');
  if (gainers.length === 0) {
    lines.push('暂无数据');
  } else {
    gainers.slice(1).forEach((line) => lines.push(line));
  }
  lines.push('');

  lines.push('## 现货跌幅前三');
  const losers = renderSimpleList('', data.spotLeaderboards?.losersTop3, '跌幅');
  if (losers.length === 0) {
    lines.push('暂无数据');
  } else {
    losers.slice(1).forEach((line) => lines.push(line));
  }
  lines.push('');

  lines.push('## 交易所热度前三');
  const exchangeHot = renderSimpleList('', data.leaderboards?.exchangeHotTop3, '热度');
  if (exchangeHot.length === 0) {
    lines.push('暂无数据');
  } else {
    exchangeHot.slice(1).forEach((line) => lines.push(line));
  }
  lines.push('');

  lines.push('## 钱包热度前三');
  const walletHot = renderSimpleList('', data.leaderboards?.walletHotTop3, '热度');
  if (walletHot.length === 0) {
    lines.push('暂无数据');
  } else {
    walletHot.slice(1).forEach((line) => lines.push(line));
  }
  lines.push('');

  lines.push('## Meme 雷达');
  const memeLines = renderMemeRadarBlock(data.memeRadar || {});
  if (memeLines.length === 0) {
    lines.push('暂无可用 Meme 雷达。');
  } else {
    memeLines.forEach((line) => lines.push(line));
  }
  lines.push('');

  lines.push('## 值得看 Top');
  if (sorted.length === 0) {
    lines.push('暂无明确入选标的。');
  } else {
    sorted.slice(0, getTopN(data, 5)).forEach((item) => {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? ` [${item.chain}]` : '';
      const score = typeof item.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item.action || item.verdict || '观察';
      lines.push(`- ${symbol}${chain}｜${action}｜${score}`);
      lines.push(`  ${stringValue(item.reason, '数据不足，暂不下结论。')}`);
    });
  }
  lines.push('');

  lines.push('## 风险');
  const riskAlerts = ensureArray(data.riskAlerts);
  if (riskAlerts.length === 0) {
    lines.push('暂无高亮风险。');
  } else {
    riskAlerts.forEach((risk) => {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? ` [${risk.chain}]` : '';
      lines.push(`- ${symbol}${chain}｜${stringValue(risk.reason, '存在风险')}`);
    });
  }
  lines.push('');

  lines.push('## 结论');
  const conclusion = ensureArray(data.conclusion);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    conclusion.forEach((item) => lines.push(`- ${item}`));
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderSquare(data) {
  const lines = [];

  if (data.preferences?.squareDisclosureEnabled) {
    lines.push('本文由OpenClaw发出');
    lines.push('');
  }

  if (data.queryType === 'help') {
    return renderHelp(data);
  }

  if (data.queryType === 'token') {
    const token = getPrimaryToken(data);
    const symbol = token.symbol || token.name || '未知代币';
    const chain = token.chain ? ` [${token.chain}]` : '';
    const score = typeof token.score === 'number' ? `${token.score}/100` : '未评分';
    const action = token.action || token.verdict || '观察';

    lines.push(`Alpha Radar｜${symbol}${chain} ${stringValue(data.window, '24h')} 预览`);
    lines.push('');
    lines.push(`结论：${action}｜${score}`);
    lines.push(`看点：${stringValue(token.reason, '暂未获得充分结论。')}`);
    lines.push(`关键数据：${formatMetrics(token.metrics || {})}`);
    lines.push(`风险：${stringValue(token.risk, '未见单独高亮风险。')}`);
    lines.push('DYOR。以上仅为研究整理，不构成任何建议。');
    return `${lines.join('\n').trim()}\n`;
  }

  const label = scopeLabel(data);
  const topItems = sortWatchlist(data.watchlist).slice(0, Math.min(getTopN(data, 3), 3));
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);

  lines.push(`Alpha Radar｜${label} ${stringValue(data.window, '24h')} 预览`);
  lines.push('');
  lines.push(`主线：${stringValue(data.marketTheme.summary, '今日主线暂不明确。')}`);

  const spotGainers = data.preferences?.showSpotLeaderboards === false ? [] : renderSimpleList('现货涨幅前三', data.spotLeaderboards?.gainersTop3, '涨幅');
  const spotLosers = data.preferences?.showSpotLeaderboards === false ? [] : renderSimpleList('现货跌幅前三', data.spotLeaderboards?.losersTop3, '跌幅');
  const exchangeHot = data.preferences?.showExchangeHot === false ? [] : renderSimpleList('交易所热度前三', data.leaderboards?.exchangeHotTop3, '热度');
  const walletHot = data.preferences?.showWalletHot === false ? [] : renderSimpleList('钱包热度前三', data.leaderboards?.walletHotTop3, '热度');
  const memeRadar = data.preferences?.showMemeRadar === false ? [] : renderMemeRadarBlock(data.memeRadar || {});

  if (spotGainers.length) {
    lines.push('');
    lines.push(...spotGainers);
  }
  if (spotLosers.length) {
    lines.push('');
    lines.push(...spotLosers);
  }
  if (exchangeHot.length) {
    lines.push('');
    lines.push(...exchangeHot);
  }
  if (walletHot.length) {
    lines.push('');
    lines.push(...walletHot);
  }
  if (memeRadar.length) {
    lines.push('');
    lines.push(...memeRadar);
  }

  lines.push('');
  lines.push('值得看：');
  if (topItems.length === 0) {
    lines.push('1. 今日暂无明确入选标的');
  } else {
    topItems.forEach((item, index) => {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? ` [${item.chain}]` : '';
      const score = typeof item.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item.action || item.verdict || '观察';
      lines.push(`${index + 1}. ${symbol}${chain}｜${action}｜${score}`);
      lines.push(`   ${stringValue(item.reason, '数据不足，暂不下结论。')}`);
    });
  }

  lines.push('');
  lines.push('风险：');
  if (topRisks.length === 0) {
    lines.push('- 暂无单独高亮风险样本');
  } else {
    for (const risk of topRisks) {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? ` [${risk.chain}]` : '';
      lines.push(`- ${symbol}${chain}：${stringValue(risk.reason, '存在风险')}`);
    }
  }

  lines.push('');
  lines.push('结论：优先看现货涨跌榜、交易所热度、钱包热度和 Meme 雷达是否共振。');
  lines.push('DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderTg(data) {
  if (data.queryType === 'help') return renderHelp(data);
  if (data.queryType === 'token') return renderTokenTg(data);
  return renderMarketTg(data);
}

module.exports = {
  renderTg,
  renderReport,
  renderSquare,
  renderHelp,
  formatMetrics,
  stringValue,
  scopeLabel
};
