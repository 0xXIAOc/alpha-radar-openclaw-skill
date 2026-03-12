#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validateReportData } = require('../src/schema');
const { renderTg, renderReport, renderSquare, defaultHelpCards } = require('../src/render');

const RESERVED_SCOPE_WORDS = new Set(['auto', 'global', 'solana', 'bsc', 'base', 'eth', 'ethereum']);
const CHINESE_TOP_MAP = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  五: 5,
  十: 10
};

function readOptionValue(argv, index, token) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Missing value for ${token}`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--input') {
      args.input = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--style' || token === '--mode') {
      args.style = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--format') {
      args.format = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--output') {
      args.output = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--title') {
      args.title = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--scope' || token === '--chain-scope') {
      args.scope = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--chain') {
      args.chain = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--window') {
      args.window = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--preview') {
      args.preview = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--profile') {
      args.profile = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--risk') {
      args.risk = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--top') {
      args.top = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--lang') {
      args.lang = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--wallet') {
      args.wallet = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--token' || token === '--symbol') {
      args.token = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--contract') {
      args.contract = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--query-type') {
      args.queryType = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--disclosure') {
      args.disclosure = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--ask-disclosure') {
      args.askDisclosure = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--show-spot') {
      args.showSpot = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--show-exchange-hot') {
      args.showExchangeHot = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--show-wallet-hot') {
      args.showWalletHot = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--show-meme') {
      args.showMeme = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--show-futures') {
      args.showFutures = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--command') {
      args.command = readOptionValue(argv, i, token);
      i += 1;
    } else if (token === '--validate-only' || token === '--dry-run') {
      args.validateOnly = true;
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
    '  node scripts/render-report.js --input <json-file> --format json',
    '  node scripts/render-report.js --input <json-file> --validate-only',
    '  cat data.json | node scripts/render-report.js --style tg',
    '',
    'Options:',
    '  --input <path>            JSON input file. Omit to read from stdin.',
    '  --style <style>           tg | report | square',
    '  --format <format>         text | json',
    '  --validate-only           Validate and normalize only, do not render text.',
    '  --dry-run                 Alias of --validate-only.',
    '  --output <path>           Write output to file.',
    '  --title <title>           Override report title.',
    '  --scope <scope>           auto | global | solana | bsc | base | eth',
    '  --chain <chain>           Override human-readable chain label.',
    '  --window <window>         Override time window, e.g. 24h.',
    '  --preview <bool>          true | false',
    '  --profile <value>         cautious | balanced | aggressive',
    '  --risk <value>            low | balanced | high',
    '  --top <n>                 shortlist size',
    '  --lang <value>            zh',
    '  --wallet <bool>           true | false',
    '  --token <value>           token symbol/name',
    '  --contract <value>        contract address',
    '  --disclosure <bool>       square disclosure on/off',
    '  --ask-disclosure <bool>   ask every time on/off',
    '  --show-spot <bool>        show spot gainers/losers',
    '  --show-exchange-hot <bool>',
    '  --show-wallet-hot <bool>',
    '  --show-meme <bool>',
    '  --show-futures <bool>',
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

function normalizeFormat(value) {
  if (!value) return 'text';
  const normalized = String(value).trim().toLowerCase();
  if (['text', 'txt', 'markdown', 'md'].includes(normalized)) return 'text';
  if (normalized === 'json') return 'json';
  throw new Error(`Invalid format: ${value}. Expected "text" or "json".`);
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

function isReservedTokenCandidate(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return RESERVED_SCOPE_WORDS.has(normalized) || normalized === 'alpha';
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
  if (/(^|\s)(ethereum|eth)(\s|$)/i.test(text)) result.scope = 'ethereum';

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
  if (/(^|\s)(衍生品关|合约关)(\s|$)/.test(text)) result.showFutures = 'false';
  if (/(^|\s)(衍生品开|合约开)(\s|$)/.test(text)) result.showFutures = 'true';

  if (/(^|\s)(署名开)(\s|$)/.test(text)) result.disclosure = 'true';
  if (/(^|\s)(署名关)(\s|$)/.test(text)) result.disclosure = 'false';
  if (/(^|\s)(每次询问)(\s|$)/.test(text)) result.askDisclosure = 'true';
  if (/(^|\s)(不再询问|记住设置)(\s|$)/.test(text)) result.askDisclosure = 'false';

  const topMatch = text.match(/前\s*(\d+)/);
  if (topMatch) {
    result.top = topMatch[1];
  } else {
    const topCnMatch = text.match(/前\s*(一|二|两|三|五|十)/);
    if (topCnMatch) {
      result.top = String(CHINESE_TOP_MAP[topCnMatch[1]]);
    }
  }

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
      const candidate = match?.[1];
      if (candidate && !isReservedTokenCandidate(candidate)) {
        result.token = candidate;
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

function chainLabelFromScope(scope, fallback = 'Auto') {
  switch (scope) {
    case 'auto':
      return 'Auto';
    case 'global':
      return 'Global';
    case 'solana':
      return 'Solana';
    case 'bsc':
      return 'BSC';
    case 'base':
      return 'Base';
    case 'eth':
      return 'ETH';
    case 'ethereum':
      return 'Ethereum';
    default:
      return fallback;
  }
}

function isSingleChainScope(scope) {
  return ['solana', 'bsc', 'base', 'eth', 'ethereum'].includes(scope);
}

function normalizeData(raw, args = {}) {
  const validated = validateReportData(raw);
  const aliasArgs = parseNaturalCommand(args.command || '');
  const mergedArgs = applyAliasObject({ ...args }, aliasArgs);

  const mode = normalizeStyle(mergedArgs.style || validated.mode || 'tg');
  const scope =
    normalizeScope(mergedArgs.scope) ||
    normalizeScope(mergedArgs.chain) ||
    normalizeScope(validated.chainScope) ||
    normalizeScope(validated.chain) ||
    'auto';

  const token = mergedArgs.token || validated.tokenQuery?.token || validated.tokenQuery?.symbol;
  const contract = mergedArgs.contract || validated.tokenQuery?.contractAddress;
  const queryType = mergedArgs.queryType || (token || contract ? 'token' : validated.queryType || 'market');
  const resolvedChainLabel =
    mergedArgs.chain ||
    (scope === 'custom' ? validated.chain || 'Auto' : chainLabelFromScope(scope, validated.chain || 'Auto'));
  const resolvedTokenChain =
    mergedArgs.chain ||
    validated.tokenQuery?.chain ||
    (isSingleChainScope(scope) ? chainLabelFromScope(scope) : undefined);

  const merged = {
    ...validated,
    queryType,
    mode,
    chainScope: scope,
    title: mergedArgs.title || validated.title || '',
    chain: resolvedChainLabel,
    window: mergedArgs.window || validated.window || '24h',
    previewOnly: normalizeBoolean(mergedArgs.preview, validated.previewOnly !== false),
    tokenQuery: {
      ...(validated.tokenQuery || {}),
      ...(token ? { token, symbol: token } : {}),
      ...(contract ? { contractAddress: contract } : {}),
      ...(resolvedTokenChain ? { chain: resolvedTokenChain } : {})
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
      ...(mergedArgs.showFutures !== undefined ? { showFuturesSentiment: normalizeBoolean(mergedArgs.showFutures, validated.preferences?.showFuturesSentiment !== false) } : {}),
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

    const format = normalizeFormat(args.format);
    const rawText = await readRawInput(args.input);
    const rawJson = JSON.parse(rawText);
    const data = normalizeData(rawJson, args);

    let output;
    if (args.validateOnly) {
      output =
        format === 'json'
          ? `${JSON.stringify(data, null, 2)}\n`
          : `Validation OK | mode=${data.mode} | queryType=${data.queryType} | scope=${data.chainScope}\n`;
    } else if (format === 'json') {
      output = `${JSON.stringify(data, null, 2)}\n`;
    } else if (data.mode === 'report') {
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
  normalizeFormat,
  usage,
  chainLabelFromScope,
  isSingleChainScope
};
