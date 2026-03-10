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

function formatMetrics(metrics = {}) {
  const pairs = [
    ['价格', metrics.price],
    ['24h成交量', metrics.volume24h],
    ['流动性', metrics.liquidity],
    ['Holders', metrics.holders],
    ['Top10占比', metrics.top10Pct],
    ['Smart Money', metrics.smartMoney],
    ['风险等级', metrics.riskLevel]
  ];

  const parts = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}：${value}`);

  return parts.length > 0 ? parts.join('；') : '关键数据未提供';
}

function renderMarketTheme(data) {
  const lines = [];
  lines.push('## 一、今日市场主线');
  lines.push(stringValue(data.marketTheme.summary, '数据不足，暂不下结论。'));

  const signals = ensureArray(data.marketTheme.signals);
  for (const signal of signals) {
    lines.push(`- ${signal}`);
  }

  if (data.marketTheme.stance) {
    lines.push(`结论倾向：${data.marketTheme.stance}`);
  }

  lines.push('');
  return lines;
}

function renderWatchlist(data) {
  const lines = [];
  lines.push('## 二、今日值得看名单');

  if (data.watchlist.length === 0) {
    lines.push('暂无符合条件的标的。');
    lines.push('');
    return lines;
  }

  for (const item of data.watchlist) {
    const symbol = item.symbol || item.name || '未知代币';
    lines.push(`### ${symbol}`);
    lines.push(`结论：${stringValue(item.verdict, '继续观察')}`);
    lines.push(`入选理由：${stringValue(item.reason, '数据不足，暂不下结论。')}`);
    lines.push(`关键数据：${formatMetrics(item.metrics || {})}`);
    lines.push(`当前风险点：${stringValue(item.risk, '未见单独高亮风险。')}`);
    lines.push(`下一步观察点：${stringValue(item.next, '继续观察资金、热度与风控是否共振。')}`);
    lines.push('');
  }

  return lines;
}

function renderRiskAlerts(data) {
  const lines = [];
  lines.push('## 三、今日风险警报');

  if (data.riskAlerts.length === 0) {
    lines.push('今日未发现需要单独高亮的风险样本。');
    lines.push('');
    return lines;
  }

  for (const alert of data.riskAlerts) {
    lines.push(`- **${stringValue(alert.symbol || alert.name, '未知代币')}**：${stringValue(alert.reason, '存在风险')}`);
    const flags = ensureArray(alert.flags);
    if (flags.length > 0) {
      lines.push(`  风险项：${flags.join('；')}`);
    }
  }

  lines.push('');
  return lines;
}

function renderWalletAppendix(data) {
  const lines = [];
  lines.push('## 四、今日观察钱包 / 聪明钱附录');
  lines.push(stringValue(data.walletAppendix.summary, '暂无附录数据。'));

  const notes = ensureArray(data.walletAppendix.notes);
  for (const note of notes) {
    lines.push(`- ${note}`);
  }

  lines.push('');
  return lines;
}

function renderConclusion(data) {
  const lines = [];
  lines.push('## 五、今日结论');

  if (data.conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of data.conclusion) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
  lines.push('');
  return lines;
}

function renderReport(data) {
  const title = data.title || `今日多维体检日报 | ${stringValue(data.chain, 'Unknown')} | ${stringValue(data.window, '')}`;
  const lines = [`# ${title}`];

  if (data.generatedAt) {
    lines.push(`生成时间：${data.generatedAt}`);
  }

  lines.push('');
  lines.push(...renderMarketTheme(data));
  lines.push(...renderWatchlist(data));
  lines.push(...renderRiskAlerts(data));
  lines.push(...renderWalletAppendix(data));
  lines.push(...renderConclusion(data));

  return `${lines.join('\n').trim()}\n`;
}

function renderSquare(data) {
  const lines = [];
  lines.push(`【${stringValue(data.chain, '市场')} Watchlist Delta | ${stringValue(data.window, '')}】`);
  lines.push(stringValue(data.marketTheme.summary, '今日主线暂不明确。'));
  lines.push('');

  lines.push('值得看：');
  if (data.watchlist.length === 0) {
    lines.push('- 今日暂无明确入选标的');
  } else {
    for (const item of data.watchlist.slice(0, 3)) {
      const symbol = item.symbol || item.name || '未知代币';
      const liquidity = item.metrics?.liquidity ? `流动性 ${item.metrics.liquidity}` : '流动性未提供';
      const top10 = item.metrics?.top10Pct ? `Top10 ${item.metrics.top10Pct}` : 'Top10 未提供';
      lines.push(
        `- ${symbol}：${stringValue(item.verdict, '继续观察')}，${stringValue(item.reason, '数据不足，暂不下结论。')}；${liquidity}；${top10}`
      );
    }
  }

  lines.push('');
  lines.push('风险警报：');
  if (data.riskAlerts.length === 0) {
    lines.push('- 暂无单独高亮风险样本');
  } else {
    for (const alert of data.riskAlerts.slice(0, 2)) {
      lines.push(`- ${stringValue(alert.symbol || alert.name, '未知代币')}：${stringValue(alert.reason, '存在风险')}`);
    }
  }

  lines.push('');
  lines.push('结论：今天更值得关注热度、资金与风控同时过线的名字，而不是单看涨幅。');
  lines.push('DYOR。以上仅为数据整理与研究辅助，不构成任何建议。');

  return `${lines.join('\n').trim()}\n`;
}

module.exports = {
  renderReport,
  renderSquare,
  formatMetrics,
  stringValue
};
