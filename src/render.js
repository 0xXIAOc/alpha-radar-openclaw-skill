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

function preferenceSummary(preferences = {}) {
  const parts = [];
  if (preferences.profile) parts.push(`profile=${preferences.profile}`);
  if (preferences.risk) parts.push(`risk=${preferences.risk}`);
  if (typeof preferences.topN === 'number') parts.push(`top=${preferences.topN}`);
  if (preferences.lang) parts.push(`lang=${preferences.lang}`);
  if (typeof preferences.wallet === 'boolean') parts.push(`wallet=${preferences.wallet ? 'on' : 'off'}`);
  if (typeof preferences.preview === 'boolean') parts.push(`preview=${preferences.preview ? 'on' : 'off'}`);
  if (typeof preferences.squareDisclosureEnabled === 'boolean') parts.push(`署名=${preferences.squareDisclosureEnabled ? '开' : '关'}`);
  if (typeof preferences.squareDisclosureAskEveryTime === 'boolean') parts.push(`每次询问=${preferences.squareDisclosureAskEveryTime ? '是' : '否'}`);
  return parts.join(' | ');
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

function renderMarketLeaderboardsTg(leaderboards = {}) {
  const lines = [];

  const groups = [
    ['涨幅前三', ensureArray(leaderboards.gainersTop3), '涨幅'],
    ['跌幅前三', ensureArray(leaderboards.losersTop3), '跌幅'],
    ['交易所热度前三', ensureArray(leaderboards.exchangeHotTop3), '热度'],
    ['钱包热度前三', ensureArray(leaderboards.walletHotTop3), '热度']
  ];

  let hasAny = false;
  for (const [title, items, metricLabel] of groups) {
    if (items.length > 0) {
      hasAny = true;
      lines.push(`${title}：`);
      items.slice(0, 3).forEach((item, idx) => {
        lines.push(`- ${idx + 1}. ${formatLeaderboardItem(item, metricLabel)}`);
      });
      lines.push('');
    }
  }

  return hasAny ? lines : [];
}

function renderMarketTg(data) {
  const lines = [];
  const label = scopeLabel(data);
  const topItems = sortWatchlist(data.watchlist).slice(0, getTopN(data, 3));
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);

  lines.push(`Alpha Radar | ${label} ${stringValue(data.window, '24h')}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push('模式：TG 简版预览');

  lines.push('');
  lines.push(`主线：${stringValue(data.marketTheme.summary, '数据不足，暂不下结论。')}`);
  if (data.marketTheme.stance) {
    lines.push(`倾向：${data.marketTheme.stance}`);
  }

  const leaderboardLines = renderMarketLeaderboardsTg(data.leaderboards || {});
  if (leaderboardLines.length > 0) {
    lines.push('');
    lines.push(...leaderboardLines);
  }

  lines.push('Top：');
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

  lines.push(`Alpha Radar | ${symbol}${chain} ${stringValue(data.window, '24h')}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push('模式：代币 TG 简版');

  lines.push('');
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

function renderMarketSnapshotReport(leaderboards = {}) {
  const lines = [];
  const groups = [
    ['涨幅前三', ensureArray(leaderboards.gainersTop3), '涨幅'],
    ['跌幅前三', ensureArray(leaderboards.losersTop3), '跌幅'],
    ['交易所热度前三', ensureArray(leaderboards.exchangeHotTop3), '热度'],
    ['钱包热度前三', ensureArray(leaderboards.walletHotTop3), '热度']
  ];

  let hasAny = false;
  for (const [title, items, metricLabel] of groups) {
    if (items.length > 0) {
      hasAny = true;
      lines.push(`### ${title}`);
      items.slice(0, 3).forEach((item, idx) => {
        lines.push(`${idx + 1}. ${formatLeaderboardItem(item, metricLabel)}`);
      });
      lines.push('');
    }
  }

  if (!hasAny) {
    lines.push('暂无可用榜单快照。');
    lines.push('');
  }

  return lines;
}

function renderReport(data) {
  if (data.queryType === 'token') {
    return renderTokenReport(data);
  }

  const label = scopeLabel(data);
  const sorted = sortWatchlist(data.watchlist);
  const lines = [];

  lines.push(`# ${data.title || `Alpha Radar | ${label} | ${stringValue(data.window, '24h')}`}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push(`模式：${data.mode || 'report'}`);
  lines.push(`范围：${label}`);
  lines.push(`偏好：${preferenceSummary(data.preferences || {})}`);
  lines.push(`发布：${data.previewOnly !== false ? '仅预览，不发广场' : '可发布'}`);
  lines.push('');

  if (shouldShowFailureDetails(data, 'report')) {
    lines.push('## 0、上游调用');
    for (const call of ensureArray(data.upstreamCalls)) {
      if (call.status === 'failed') {
        lines.push(`- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`);
      } else if (call.status === 'partial') {
        lines.push(`- \`${call.skill}\` 部分成功${call.message ? `：${call.message}` : ''}`);
      } else if (call.status === 'ok') {
        lines.push(`- \`${call.skill}\` 成功`);
      }
    }
    lines.push('');
  }

  lines.push('## 一、今日市场主线');
  lines.push(stringValue(data.marketTheme.summary, '数据不足，暂不下结论。'));
  const marketSignals = ensureArray(data.marketTheme.signals);
  for (const signal of marketSignals) lines.push(`- ${signal}`);
  if (data.marketTheme.stance) lines.push(`结论倾向：${data.marketTheme.stance}`);
  lines.push('');

  lines.push('## 二、市场榜单快照');
  lines.push(...renderMarketSnapshotReport(data.leaderboards || {}));

  lines.push('## 三、今日值得看名单');
  if (sorted.length === 0) {
    lines.push('暂无符合条件的标的。');
  } else {
    for (const item of sorted.slice(0, getTopN(data, 5))) {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? ` [${item.chain}]` : '';
      lines.push(`### ${symbol}${chain}`);
      lines.push(`动作：${item.action || item.verdict || '观察'}`);
      if (typeof item.score === 'number') lines.push(`评分：${item.score}/100`);
      lines.push(`置信度：${confidenceLabel(item.confidence || 'medium')}`);
      const flags = ensureArray(item.sourceFlags);
      if (flags.length > 0) lines.push(`来源标记：${flags.join(' / ')}`);
      if (item.delta) lines.push(`变化：${item.delta}`);
      lines.push(`入选理由：${stringValue(item.reason, '数据不足，暂不下结论。')}`);
      lines.push(`关键数据：${formatMetrics(item.metrics || {})}`);
      lines.push(`当前风险点：${stringValue(item.risk, '未见单独高亮风险。')}`);
      lines.push(`下一步观察点：${stringValue(item.next, '继续观察资金、热度与风控是否共振。')}`);
      lines.push('');
    }
  }

  lines.push('## 四、今日风险警报');
  const riskAlerts = ensureArray(data.riskAlerts);
  if (riskAlerts.length === 0) {
    lines.push('今日未发现需要单独高亮的风险样本。');
  } else {
    for (const risk of riskAlerts) {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? ` [${risk.chain}]` : '';
      lines.push(`- **${symbol}${chain}** | ${severityLabel(risk.severity || 'medium')} | ${risk.category || 'trading'}：${stringValue(risk.reason, '存在风险')}`);
      const flags = ensureArray(risk.flags);
      if (flags.length > 0) lines.push(`  风险项：${flags.join('；')}`);
    }
  }
  lines.push('');

  lines.push('## 五、今日观察钱包 / 聪明钱附录');
  if (data.preferences && data.preferences.wallet === false) {
    lines.push('本轮按偏好设置关闭钱包附录。');
  } else {
    lines.push(stringValue(data.walletAppendix.summary, '暂无附录数据。'));
    const notes = ensureArray(data.walletAppendix.notes);
    for (const note of notes) lines.push(`- ${note}`);
  }
  lines.push('');

  lines.push('## 六、今日结论');
  const conclusion = ensureArray(data.conclusion);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of conclusion) lines.push(`- ${item}`);
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
  lines.push('');

  return `${lines.join('\n').trim()}\n`;
}

function renderTokenReport(data) {
  const token = getPrimaryToken(data);
  const symbol = token.symbol || token.name || '未知代币';
  const chain = token.chain ? ` [${token.chain}]` : '';
  const lines = [];

  lines.push(`# ${data.title || `Alpha Radar | ${symbol}${chain} | ${stringValue(data.window, '24h')}`}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push(`模式：${data.mode || 'report'}`);
  lines.push(`偏好：${preferenceSummary(data.preferences || {})}`);
  lines.push(`发布：${data.previewOnly !== false ? '仅预览，不发广场' : '可发布'}`);
  lines.push('');

  if (shouldShowFailureDetails(data, 'report')) {
    lines.push('## 0、上游调用');
    for (const call of ensureArray(data.upstreamCalls)) {
      if (call.status === 'failed') {
        lines.push(`- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`);
      } else if (call.status === 'partial') {
        lines.push(`- \`${call.skill}\` 部分成功${call.message ? `：${call.message}` : ''}`);
      } else if (call.status === 'ok') {
        lines.push(`- \`${call.skill}\` 成功`);
      }
    }
    lines.push('');
  }

  lines.push('## 一、代币概览');
  lines.push(`代币：${symbol}${chain}`);
  if (token.contractAddress) lines.push(`合约：${token.contractAddress}`);
  lines.push(`动作：${token.action || token.verdict || '观察'}`);
  if (typeof token.score === 'number') lines.push(`评分：${token.score}/100`);
  lines.push(`置信度：${confidenceLabel(token.confidence || 'medium')}`);
  lines.push(`核心判断：${stringValue(token.reason, '暂未获得充分结论。')}`);
  lines.push(`关键数据：${formatMetrics(token.metrics || {})}`);
  lines.push('');

  lines.push('## 二、关键信号');
  const flags = ensureArray(token.sourceFlags);
  if (flags.length > 0) {
    lines.push(`来源标记：${flags.join(' / ')}`);
  } else {
    lines.push('来源标记：未标注');
  }
  if (token.delta) lines.push(`变化：${token.delta}`);
  lines.push(`下一步观察点：${stringValue(token.next, '继续观察资金、成交与风险是否共振。')}`);
  lines.push('');

  lines.push('## 三、风险提示');
  lines.push(stringValue(token.risk, '未见单独高亮风险。'));
  const riskAlerts = ensureArray(data.riskAlerts);
  for (const risk of riskAlerts.slice(0, 3)) {
    lines.push(`- ${stringValue(risk.reason, '存在风险')}`);
  }
  lines.push('');

  lines.push('## 四、结论');
  const conclusion = ensureArray(data.conclusion);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of conclusion) lines.push(`- ${item}`);
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
  lines.push('');

  return `${lines.join('\n').trim()}\n`;
}

function renderSquare(data) {
  if (data.queryType === 'token') {
    return renderTokenSquare(data);
  }

  const label = scopeLabel(data);
  const topItems = sortWatchlist(data.watchlist).slice(0, Math.min(getTopN(data, 3), 3));
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);
  const lines = [];

  if (data.preferences?.squareDisclosureEnabled) {
    lines.push('本文由OpenClaw发出');
    lines.push('');
  }

  lines.push(`Alpha Radar｜${label} ${stringValue(data.window, '24h')} 预览`);
  lines.push('');
  lines.push(`主线：${stringValue(data.marketTheme.summary, '今日主线暂不明确。')}`);
  if (data.marketTheme.stance) lines.push(`立场：${data.marketTheme.stance}`);

  const groups = [
    ['涨幅前三', ensureArray(data.leaderboards?.gainersTop3), '涨幅'],
    ['跌幅前三', ensureArray(data.leaderboards?.losersTop3), '跌幅'],
    ['交易所热度前三', ensureArray(data.leaderboards?.exchangeHotTop3), '热度'],
    ['钱包热度前三', ensureArray(data.leaderboards?.walletHotTop3), '热度']
  ];

  groups.forEach(([title, items, metricLabel]) => {
    if (items.length > 0) {
      lines.push('');
      lines.push(`${title}：`);
      items.slice(0, 3).forEach((item, index) => {
        lines.push(`${index + 1}. ${formatLeaderboardItem(item, metricLabel)}`);
      });
    }
  });

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
  lines.push('结论：优先看热度、成交、流动性与风控能否持续共振，而不是只看单日涨幅。');
  lines.push('DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderTokenSquare(data) {
  const token = getPrimaryToken(data);
  const symbol = token.symbol || token.name || '未知代币';
  const chain = token.chain ? ` [${token.chain}]` : '';
  const score = typeof token.score === 'number' ? `${token.score}/100` : '未评分';
  const action = token.action || token.verdict || '观察';
  const lines = [];

  if (data.preferences?.squareDisclosureEnabled) {
    lines.push('本文由OpenClaw发出');
    lines.push('');
  }

  lines.push(`Alpha Radar｜${symbol}${chain} ${stringValue(data.window, '24h')} 预览`);
  lines.push('');
  lines.push(`结论：${action}｜${score}`);
  lines.push(`看点：${stringValue(token.reason, '暂未获得充分结论。')}`);
  lines.push(`关键数据：${formatMetrics(token.metrics || {})}`);
  lines.push(`风险：${stringValue(token.risk, '未见单独高亮风险。')}`);
  lines.push('DYOR。以上仅为研究整理，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

function renderTg(data) {
  if (data.queryType === 'token') return renderTokenTg(data);
  return renderMarketTg(data);
}

module.exports = {
  renderTg,
  renderReport,
  renderSquare,
  formatMetrics,
  stringValue,
  scopeLabel
};
