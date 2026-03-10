#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { style: 'report' };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input') args.input = argv[++i];
    else if (token === '--style') args.style = argv[++i];
    else if (token === '--output') args.output = argv[++i];
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/render-report.js --input <json-file> --style report',
    '  node scripts/render-report.js --input <json-file> --style square',
    '  node scripts/render-report.js --input <json-file> --style report --output out.md'
  ].join('\n');
}

function readJson(filePath) {
  if (!filePath) throw new Error('Missing required argument: --input');
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Input file not found: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function stringValue(value, fallback = '数据未提供') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function normalizeArray(value) {
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
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (pairs.length === 0) return '关键数据未提供';
  return pairs.map(([label, value]) => `${label}：${value}`).join('；');
}

function renderMarketTheme(data) {
  const lines = [];
  lines.push('## 一、今日市场主线');
  lines.push(stringValue(data.marketTheme?.summary, '数据不足，暂不下结论。'));

  const signals = normalizeArray(data.marketTheme?.signals);
  if (signals.length > 0) {
    for (const signal of signals) lines.push(`- ${signal}`);
  }

  if (data.marketTheme?.stance) lines.push(`结论倾向：${data.marketTheme.stance}`);
  lines.push('');
  return lines;
}

function renderWatchlist(data) {
  const lines = [];
  lines.push('## 二、今日值得看名单');
  const watchlist = normalizeArray(data.watchlist);
  if (watchlist.length === 0) {
    lines.push('暂无符合条件的标的。');
    lines.push('');
    return lines;
  }

  for (const item of watchlist) {
    lines.push(`### ${stringValue(item.symbol, '未知代币')}`);
    lines.push(`结论：${stringValue(item.verdict, '继续观察')}`);
    lines.push(`入选理由：${stringValue(item.reason)}`);
    lines.push(`关键数据：${formatMetrics(item.metrics || {})}`);
    lines.push(`当前风险点：${stringValue(item.risk)}`);
    lines.push(`下一步观察点：${stringValue(item.next)}`);
    lines.push('');
  }

  return lines;
}

function renderRiskAlerts(data) {
  const lines = [];
  lines.push('## 三、今日风险警报');
  const alerts = normalizeArray(data.riskAlerts);
  if (alerts.length === 0) {
    lines.push('今日未发现需要单独高亮的风险样本。');
    lines.push('');
    return lines;
  }

  for (const alert of alerts) {
    lines.push(`- **${stringValue(alert.symbol, '未知代币')}**：${stringValue(alert.reason, '存在风险')}`);
    const flags = normalizeArray(alert.flags);
    if (flags.length > 0) lines.push(`  风险项：${flags.join('；')}`);
  }
  lines.push('');
  return lines;
}

function renderWalletAppendix(data) {
  const lines = [];
  lines.push('## 四、今日观察钱包 / 聪明钱附录');
  lines.push(stringValue(data.walletAppendix?.summary, '暂无附录数据。'));
  const notes = normalizeArray(data.walletAppendix?.notes);
  if (notes.length > 0) {
    for (const note of notes) lines.push(`- ${note}`);
  }
  lines.push('');
  return lines;
}

function renderConclusion(data) {
  const lines = [];
  lines.push('## 五、今日结论');
  const conclusion = normalizeArray(data.conclusion);
  if (conclusion.length === 0) {
    lines.push('- 数据不足，暂不下结论。');
  } else {
    for (const item of conclusion) lines.push(`- ${item}`);
  }
  lines.push('- DYOR。以上仅为研究整理，不构成任何建议。');
  lines.push('');
  return lines;
}

function renderReport(data) {
  const lines = [];
  lines.push(`# 今日多维体检日报 | ${stringValue(data.chain, 'Unknown')} | ${stringValue(data.window, '')}`);
  if (data.generatedAt) lines.push(`生成时间：${data.generatedAt}`);
  lines.push('');
  lines.push(...renderMarketTheme(data));
  lines.push(...renderWatchlist(data));
  lines.push(...renderRiskAlerts(data));
  lines.push(...renderWalletAppendix(data));
  lines.push(...renderConclusion(data));
  return lines.join('\n').trim() + '\n';
}

function renderSquare(data) {
  const lines = [];
  lines.push(`【${stringValue(data.chain, '市场')} Watchlist Delta | ${stringValue(data.window, '')}】`);
  lines.push(stringValue(data.marketTheme?.summary, '今日主线暂不明确。'));
  lines.push('');
  lines.push('值得看：');

  const watchlist = normalizeArray(data.watchlist);
  if (watchlist.length === 0) {
    lines.push('- 今日暂无明确入选标的');
  } else {
    for (const item of watchlist.slice(0, 3)) {
      const liq = item.metrics?.liquidity ? `流动性 ${item.metrics.liquidity}` : '流动性未提供';
      const top10 = item.metrics?.top10Pct ? `Top10 ${item.metrics.top10Pct}` : 'Top10 未提供';
      lines.push(`- ${stringValue(item.symbol, '未知代币')}：${stringValue(item.verdict, '继续观察')}，${stringValue(item.reason)}；${liq}；${top10}`);
    }
  }

  lines.push('');
  lines.push('风险警报：');
  const alerts = normalizeArray(data.riskAlerts);
  if (alerts.length === 0) {
    lines.push('- 暂无单独高亮风险样本');
  } else {
    for (const alert of alerts.slice(0, 2)) {
      lines.push(`- ${stringValue(alert.symbol, '未知代币')}：${stringValue(alert.reason, '存在风险')}`);
    }
  }

  lines.push('');
  lines.push('结论：今天更值得关注热度、资金与风控同时过线的名字，而不是单看涨幅。');
  lines.push('DYOR。以上仅为数据整理与研究辅助，不构成任何建议。');
  return lines.join('\n').trim() + '\n';
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(usage() + '\n');
    process.exit(0);
  }

  const data = readJson(args.input);
  const output = args.style === 'square' ? renderSquare(data) : renderReport(data);

  if (args.output) {
    const resolved = path.resolve(process.cwd(), args.output);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, output, 'utf8');
  }

  process.stdout.write(output);
}

main();
