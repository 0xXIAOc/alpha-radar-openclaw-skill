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

function formatUpstreamSummary(upstreamCalls = []) {
  const calls = ensureArray(upstreamCalls);
  if (calls.length === 0) return '上游调用：未记录';

  const parts = calls.map((call) => {
    const icon =
      call.status === 'ok'
        ? '✓'
        : call.status === 'partial'
        ? '◐'
        : call.status === 'failed'
        ? '✗'
        : '–';
    return `${call.skill}${icon}`;
  });

  return `上游调用：${parts.join(' | ')}`;
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

function renderTg(data) {
  const lines = [];
  const label = scopeLabel(data);
  const topItems = sortWatchlist(data.watchlist).slice(0, 3);
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);
  const failedCalls = failedUpstreamCalls(data.upstreamCalls);

  lines.push(`Alpha Radar | ${label} ${stringValue(data.window, '24h')}`);

  if (data.generatedAt) {
    lines.push(`生成时间：${data.generatedAt}`);
  }

  lines.push('模式：TG 简版预览');
  if (data.previewOnly !== false) {
    lines.push('发布：仅预览，不发广场');
  }

  lines.push('');
  lines.push(formatUpstreamSummary(data.upstreamCalls));
  if (failedCalls.length > 0) {
    lines.push(`未成功：${failedCalls.map((call) => call.skill).join(' / ')}`);
  }

  lines.push('');
  lines.push(`主线：${stringValue(data.marketTheme.summary, '数据不足，暂不下结论。')}`);
  if (data.marketTheme.stance) {
    lines.push(`倾向：${data.marketTheme.stance}`);
  }

  lines.push('');
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
      const flags = ensureArray(item.sourceFlags).length > 0 ? item.sourceFlags.join('+') : '未标注来源';
      lines.push(`- ${symbol}${chain} | ${score} | ${action} | 置信度${confidence}`);
      lines.push(`  理由：${stringValue(item.reason, '数据不足，暂不下结论。')}`);
      lines.push(`  来源：${flags}`);
      lines.push(`  风险：${stringValue(item.risk, '未见单独高亮风险。')}`);
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
      lines.push(`- ${symbol}${chain} | ${severity} | ${stringValue(risk.reason, '存在风险')}`);
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

function renderReport(data) {
  const label = scopeLabel(data);
  const sorted = sortWatchlist(data.watchlist);
  const failedCalls = failedUpstreamCalls(data.upstreamCalls);
  const lines = [];

  lines.push(`# ${data.title || `Alpha Radar | ${label} | ${stringValue(data.window, '24h')}`}`);

  if (data.generatedAt) {
    lines.push(`生成时间：${data.generatedAt}`);
  }

  lines.push(`模式：${data.mode || 'report'}`);
  lines.push(`范围：${label}`);
  lines.push(`发布：${data.previewOnly !== false ? '仅预览，不发广场' : '可发布'}`);
  lines.push('');

  lines.push('## 0、上游调用');
  lines.push(formatUpstreamSummary(data.upstreamCalls));
  if (failedCalls.length > 0) {
    for (const call of failedCalls) {
      lines.push(`- 本轮未成功调用 \`${call.skill}\`${call.message ? `：${call.message}` : ''}`);
    }
  }
  lines.push('');

  lines.push('## 一、今日市场主线');
  lines.push(stringValue(data.marketTheme.summary, '数据不足，暂不下结论。'));
  const marketSignals = ensureArray(data.marketTheme.signals);
  for (const signal of marketSignals) {
    lines.push(`- ${signal}`);
  }
  if (data.marketTheme.stance) {
    lines.push(`结论倾向：${data.marketTheme.stance}`);
  }
  lines.push('');

  lines.push('## 二、今日值得看名单');
  if (sorted.length === 0) {
    lines.push('暂无符合条件的标的。');
  } else {
    for (const item of sorted.slice(0, 5)) {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? ` [${item.chain}]` : '';
      lines.push(`### ${symbol}${chain}`);
      lines.push(`动作：${item.action || item.verdict || '观察'}`);
      if (typeof item.score === 'number') {
        lines.push(`评分：${item.score}/100`);
      }
      lines.push(`置信度：${confidenceLabel(item.confidence || 'medium')}`);
      const flags = ensureArray(item.sourceFlags);
      if (flags.length > 0) {
        lines.push(`来源标记：${flags.join(' / ')}`);
      }
      if (item.delta) {
        lines.push(`变化：${item.delta}`);
      }
      lines.push(`入选理由：${stringValue(item.reason, '数据不足，暂不下结论。')}`);
      lines.push(`关键数据：${formatMetrics(item.metrics || {})}`);
      lines.push(`当前风险点：${stringValue(item.risk, '未见单独高亮风险。')}`);
      lines.push(`下一步观察点：${stringValue(item.next, '继续观察资金、热度与风控是否共振。')}`);
      lines.push('');
    }
  }

  lines.push('## 三、今日风险警报');
  const riskAlerts = ensureArray(data.riskAlerts);
  if (riskAlerts.length === 0) {
    lines.push('今日未发现需要单独高亮的风险样本。');
  } else {
    for (const risk of riskAlerts) {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? ` [${risk.chain}]` : '';
      lines.push(`- **${symbol}${chain}** | ${severityLabel(risk.severity || 'medium')} | ${risk.category || 'trading'}：${stringValue(risk.reason, '存在风险')}`);
      const flags = ensureArray(risk.flags);
      if (flags.length > 0) {
        lines.push(`  风险项：${flags.join('；')}`);
      }
    }
  }
  lines.push('');

  lines.push('## 四、今日观察钱包 / 聪明钱附录');
  lines.push(stringValue(data.walletAppendix.summary, '暂无附录数据。'));
  const notes = ensureArray(data.walletAppendix.notes);
  for (const note of notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  lines.push('## 五、今日结论');
  const conclusion = ensureArray(data.conclusion);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of conclusion) {
      lines.push(`- ${item}`);
    }
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
  lines.push('');

  return `${lines.join('\n').trim()}\n`;
}

function renderSquare(data) {
  const label = scopeLabel(data);
  const topItems = sortWatchlist(data.watchlist).slice(0, 3);
  const topRisks = ensureArray(data.riskAlerts).slice(0, 2);
  const lines = [];

  lines.push(`【Alpha Radar | ${label} ${stringValue(data.window, '24h')}】`);
  lines.push(stringValue(data.marketTheme.summary, '今日主线暂不明确。'));

  if (data.marketTheme.stance) {
    lines.push(`倾向：${data.marketTheme.stance}`);
  }

  lines.push('');
  lines.push('Top：');
  if (topItems.length === 0) {
    lines.push('- 今日暂无明确入选标的');
  } else {
    for (const item of topItems) {
      const symbol = item.symbol || item.name || '未知代币';
      const chain = item.chain ? `[${item.chain}] ` : '';
      const score = typeof item.score === 'number' ? `${item.score}/100` : '未评分';
      const action = item.action || item.verdict || '观察';
      lines.push(`- ${chain}${symbol} | ${action} | ${score}：${stringValue(item.reason, '数据不足，暂不下结论。')}`);
    }
  }

  lines.push('');
  lines.push('风险：');
  if (topRisks.length === 0) {
    lines.push('- 暂无单独高亮风险样本');
  } else {
    for (const risk of topRisks) {
      const symbol = risk.symbol || risk.name || '未知代币';
      const chain = risk.chain ? `[${risk.chain}] ` : '';
      lines.push(`- ${chain}${symbol}：${stringValue(risk.reason, '存在风险')}`);
    }
  }

  lines.push('');
  lines.push('结论：优先看热度、成交、流动性与风控能否持续共振，而不是只看单日涨幅。');
  lines.push('DYOR。以上仅为数据整理与研究辅助，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

module.exports = {
  renderTg,
  renderReport,
  renderSquare,
  formatMetrics,
  stringValue,
  scopeLabel
};
