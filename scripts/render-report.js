#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validateReportData } = require('../src/schema');
const { renderTg, renderReport, renderSquare } = require('../src/render');

function parseArgs(argv) {
  const args = {
    style: 'tg'
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--input') {
      args.input = argv[++i];
    } else if (token === '--style' || token === '--mode') {
      args.style = argv[++i];
    } else if (token === '--output') {
      args.output = argv[++i];
    } else if (token === '--title') {
      args.title = argv[++i];
    } else if (token === '--scope' || token === '--chain-scope') {
      args.scope = argv[++i];
    } else if (token === '--chain') {
      args.chain = argv[++i];
    } else if (token === '--window') {
      args.window = argv[++i];
    } else if (token === '--preview') {
      args.preview = argv[++i];
    } else if (token === '--profile') {
      args.profile = argv[++i];
    } else if (token === '--risk') {
      args.risk = argv[++i];
    } else if (token === '--top') {
      args.top = argv[++i];
    } else if (token === '--lang') {
      args.lang = argv[++i];
    } else if (token === '--wallet') {
      args.wallet = argv[++i];
    } else if (token === '--token' || token === '--symbol') {
      args.token = argv[++i];
    } else if (token === '--contract') {
      args.contract = argv[++i];
    } else if (token === '--query-type') {
      args.queryType = argv[++i];
    } else if (token === '--disclosure') {
      args.disclosure = argv[++i];
    } else if (token === '--ask-disclosure') {
      args.askDisclosure = argv[++i];
    } else if (token === '--show-spot') {
      args.showSpot = argv[++i];
    } else if (token === '--show-exchange-hot') {
      args.showExchangeHot = argv[++i];
    } else if (token === '--show-wallet-hot') {
      args.showWalletHot = argv[++i];
    } else if (token === '--show-meme') {
      args.showMeme = argv[++i];
    } else if (token === '--command') {
      args.command = argv[++i];
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/render-report.js --input <json-file> --style tg',
    '  node scripts/render-report.js --input <json-file> --style report',
    '  node scripts/render-report.js --input <json-file> --style square',
    '  cat data.json | node scripts/render-report.js --style tg',
    '',
    'Options:',
    '  --input <path>            JSON input file. Omit to read from stdin.',
    '  --style <style>           tg | report | square',
    '  --output <path>           Write output to file.',
    '  --title <title>           Override report title.',
    '  --scope <scope>           auto | global | solana | bsc | base | eth',
    '  --chain <chain>           Override human-readable chain label.',
    '  --window <window>         Override time window, e.g. 24h.',
    '  --preview <bool>          true | false',
    '  --profile <value>         cautious | balanced | aggressive',
    '  --risk <value>            low | balanced | high',
    '  --top <n>                 shortlist size',
    '  --lang <value>            zh | en',
    '  --wallet <bool>           true | false',
    '  --token <value>           token symbol/name',
    '  --contract <value>        contract address',
    '  --disclosure <bool>       square disclosure on/off',
    '  --ask-disclosure <bool>   ask every time on/off',
    '  --show-spot <bool>        show spot gainers/losers',
    '  --show-exchange-hot <bool>',
    '  --show-wallet-hot <bool>',
    '  --show-meme <bool>',
    '  --command "<raw>"         parse Chinese aliases from raw command'
  ].join('\n');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

async function readRawInput(inputPath) {
  if (inputPath && inputPath !== '-') {
    const resolved = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input file not found: ${resolved}`);
    }
    return fs.readFileSync(resolved, 'utf8');
  }

  const raw = await readStdin();
  if (!raw.trim()) {
    throw new Error('No input provided. Use --input <file> or pipe JSON via stdin.');
  }
  return raw;
}

function normalizeScope(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();

  if (normalized === '全网' || normalized === 'global') return 'global';
  if (normalized === '自动' || normalized === 'auto') return 'auto';
  if (normalized === 'sol' || normalized === 'solana' || normalized === '索拉纳') return 'solana';
  if (normalized === 'bsc') return 'bsc';
  if (normalized === 'base') return 'base';
  if (normalized === 'ethereum') return 'ethereum';
  if (normalized === 'eth') return 'eth';

  if (['auto', 'global', 'solana', 'bsc', 'base', 'eth', 'ethereum', 'custom'].includes(normalized)) {
    return normalized;
  }

  return 'custom';
}

function normalizeStyle(value) {
  if (!value) return 'tg';
  const normalized = String(value).trim().toLowerCase();

  if (['telegram', 'tg', '预览', '短版', 'tg版'].includes(normalized)) return 'tg';
  if (['full', 'report', '完整版', '长版'].includes(normalized)) return 'report';
  if (['square', '广场版', 'square版'].includes(normalized)) return 'square';

  throw new Error(`Invalid style: ${value}. Expected "tg", "report", or "square".`);
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on', '开', '是'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', '关', '否'].includes(normalized)) return false;
  return fallback;
}

function normalizeTop(value, fallback = 3) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.round(parsed), 10));
}

function applyAliasObject(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      target[key] = value;
    }
  });
  return target;
}

function parseNaturalCommand(raw) {
  const result = {};
  if (!raw || !String(raw).trim()) return result;

  const text = String(raw).trim();

  if (/(^|\s)(帮助|功能)(\s|$)/.test(text)) result.queryType = 'help';
  if (/Alpha\s*有哪.*功能/i.test(text)) result.queryType = 'help';
  if (/怎么用\s*alpha/i.test(text)) result.queryType = 'help';
  if (/alpha怎么用/i.test(text)) result.queryType = 'help';

  if (/(^|\s)(全网)(\s|$)/.test(text)) result.scope = 'global';
  if (/(^|\s)(自动)(\s|$)/.test(text)) result.scope = 'auto';
  if (/(^|\s)(solana|索拉纳)(\s|$)/i.test(text)) result.scope = 'solana';
  if (/(^|\s)(bsc)(\s|$)/i.test(text)) result.scope = 'bsc';
  if (/(^|\s)(base)(\s|$)/i.test(text)) result.scope = 'base';

  if (/(^|\s)(预览|短版|TG版)(\s|$)/.test(text)) result.style = 'tg';
  if (/(^|\s)(完整版|长版)(\s|$)/.test(text)) result.style = 'report';
  if (/(^|\s)(广场版|Square版)(\s|$)/i.test(text)) result.style = 'square';

  if (/(^|\s)(谨慎)(\s|$)/.test(text)) result.profile = 'cautious';
  if (/(^|\s)(均衡)(\s|$)/.test(text)) result.profile = 'balanced';
  if (/(^|\s)(激进)(\s|$)/.test(text)) result.profile = 'aggressive';

  if (/(^|\s)(钱包关|不看钱包)(\s|$)/.test(text)) result.wallet = 'false';
  if (/(^|\s)(钱包开|看钱包)(\s|$)/.test(text)) result.wallet = 'true';

  if (/(^|\s)(现货关)(\s|$)/.test(text)) result.showSpot = 'false';
  if (/(^|\s)(现货开)(\s|$)/.test(text)) result.showSpot = 'true';
  if (/(^|\s)(热度关)(\s|$)/.test(text)) result.showExchangeHot = 'false';
  if (/(^|\s)(热度开)(\s|$)/.test(text)) result.showExchangeHot = 'true';
  if (/(^|\s)(钱包热度关)(\s|$)/.test(text)) result.showWalletHot = 'false';
  if (/(^|\s)(钱包热度开)(\s|$)/.test(text)) result.showWalletHot = 'true';
  if (/(^|\s)(meme关)(\s|$)/i.test(text)) result.showMeme = 'false';
  if (/(^|\s)(meme开)(\s|$)/i.test(text)) result.showMeme = 'true';

  if (/(^|\s)(署名开)(\s|$)/.test(text)) result.disclosure = 'true';
  if (/(^|\s)(署名关)(\s|$)/.test(text)) result.disclosure = 'false';
  if (/(^|\s)(每次询问)(\s|$)/.test(text)) result.askDisclosure = 'true';
  if (/(^|\s)(不再询问|记住设置)(\s|$)/.test(text)) result.askDisclosure = 'false';

  const topMatch = text.match(/前\s*(\d+)/);
  if (topMatch) result.top = topMatch[1];

  const tokenEqMatch = text.match(/(?:代币|币种|token|symbol)\s*=\s*([^\s]+)/i);
  if (tokenEqMatch) {
    result.token = tokenEqMatch[1];
    result.queryType = 'token';
  }

  const naturalTokenPatterns = [
    /(?:查询|查|查一下|看看|看)\s*(?:代币|币种|token|symbol)?\s*([A-Za-z0-9._-]+)/i,
    /([A-Za-z0-9._-]+)\s*(?:怎么样|信息|资料|行情)/i
  ];

  if (!result.token) {
    for (const pattern of naturalTokenPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.token = match[1];
        result.queryType = 'token';
        break;
      }
    }
  }

  const contractMatch = text.match(/(?:合约|contract)\s*=\s*([^\s]+)/i);
  if (contractMatch) {
    result.contract = contractMatch[1];
    result.queryType = 'token';
  }

  const chainMatch = text.match(/(?:链|chain)\s*=\s*([^\s]+)/i);
  if (chainMatch) {
    result.chain = chainMatch[1];
    const scope = normalizeScope(chainMatch[1]);
    if (scope) result.scope = scope;
  }

  return result;
}

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
      examples: ['谨慎', '钱包关', '现货关', '热度开', 'meme开']
    }
  ];
}

function normalizeData(raw, args = {}) {
  const validated = validateReportData(raw);
  const aliasArgs = parseNaturalCommand(args.command || '');

  const mergedArgs = applyAliasObject({ ...args }, aliasArgs);

  const mode = normalizeStyle(mergedArgs.style || validated.mode || 'tg');
  const scope =
    normalizeScope(mergedArgs.scope) ||
    validated.chainScope ||
    (validated.chain && validated.chain !== 'Auto' ? normalizeScope(validated.chain) : 'auto') ||
    'auto';

  const token = mergedArgs.token || validated.tokenQuery?.token || validated.tokenQuery?.symbol;
  const contract = mergedArgs.contract || validated.tokenQuery?.contractAddress;
  const queryType =
    mergedArgs.queryType ||
    (token || contract ? 'token' : validated.queryType || 'market');

  const merged = {
    ...validated,
    queryType,
    mode,
    chainScope: scope,
    title: mergedArgs.title || validated.title || '',
    chain: mergedArgs.chain || validated.chain || 'Auto',
    window: mergedArgs.window || validated.window || '24h',
    previewOnly: normalizeBoolean(mergedArgs.preview, validated.previewOnly !== false),
    tokenQuery: {
      ...(validated.tokenQuery || {}),
      ...(token ? { token, symbol: token } : {}),
      ...(contract ? { contractAddress: contract } : {}),
      ...(mergedArgs.chain ? { chain: mergedArgs.chain } : {})
    },
    preferences: {
      ...(validated.preferences || {}),
      ...(mergedArgs.profile ? { profile: String(mergedArgs.profile).trim().toLowerCase() } : {}),
      ...(mergedArgs.risk ? { risk: String(mergedArgs.risk).trim().toLowerCase() } : {}),
      ...(mergedArgs.lang ? { lang: String(mergedArgs.lang).trim().toLowerCase() } : {}),
      ...(mergedArgs.top !== undefined ? { topN: normalizeTop(mergedArgs.top, validated.preferences?.topN || 3) } : {}),
      ...(mergedArgs.wallet !== undefined ? { wallet: normalizeBoolean(mergedArgs.wallet, validated.preferences?.wallet !== false) } : {}),
      ...(mergedArgs.preview !== undefined ? { preview: normalizeBoolean(mergedArgs.preview, validated.preferences?.preview !== false) } : {}),
      ...(mergedArgs.showSpot !== undefined ? { showSpotLeaderboards: normalizeBoolean(mergedArgs.showSpot, validated.preferences?.showSpotLeaderboards !== false) } : {}),
      ...(mergedArgs.showExchangeHot !== undefined ? { showExchangeHot: normalizeBoolean(mergedArgs.showExchangeHot, validated.preferences?.showExchangeHot !== false) } : {}),
      ...(mergedArgs.showWalletHot !== undefined ? { showWalletHot: normalizeBoolean(mergedArgs.showWalletHot, validated.preferences?.showWalletHot !== false) } : {}),
      ...(mergedArgs.showMeme !== undefined ? { showMemeRadar: normalizeBoolean(mergedArgs.showMeme, validated.preferences?.showMemeRadar !== false) } : {}),
      ...(mergedArgs.disclosure !== undefined ? { squareDisclosureEnabled: normalizeBoolean(mergedArgs.disclosure, validated.preferences?.squareDisclosureEnabled === true) } : {}),
      ...(mergedArgs.askDisclosure !== undefined ? { squareDisclosureAskEveryTime: normalizeBoolean(mergedArgs.askDisclosure, validated.preferences?.squareDisclosureAskEveryTime !== false) } : {})
    },
    helpCards: validated.helpCards && validated.helpCards.length > 0 ? validated.helpCards : defaultHelpCards()
  };

  return validateReportData(merged);
}

function writeOutputIfNeeded(outputPath, content) {
  if (!outputPath) return;

  const resolved = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf8');
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }

    const rawText = await readRawInput(args.input);
    const rawJson = JSON.parse(rawText);
    const data = normalizeData(rawJson, args);

    let output;
    if (data.mode === 'report') {
      output = renderReport(data);
    } else if (data.mode === 'square') {
      output = renderSquare(data);
    } else {
      output = renderTg(data);
    }

    writeOutputIfNeeded(args.output, output);
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`[alpha-radar-render] ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  parseNaturalCommand,
  normalizeData,
  normalizeScope,
  normalizeStyle,
  usage
};
