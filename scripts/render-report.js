#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validateReportData } = require('../src/schema');
const { renderReport, renderSquare } = require('../src/render');

function parseArgs(argv) {
  const args = { style: 'report' };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--input') {
      args.input = argv[++i];
    } else if (token === '--style') {
      args.style = argv[++i];
    } else if (token === '--output') {
      args.output = argv[++i];
    } else if (token === '--title') {
      args.title = argv[++i];
    } else if (token === '--chain') {
      args.chain = argv[++i];
    } else if (token === '--window') {
      args.window = argv[++i];
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
    '  node scripts/render-report.js --input <json-file> --style report',
    '  node scripts/render-report.js --input <json-file> --style square',
    '  cat data.json | node scripts/render-report.js --style report',
    '  node scripts/render-report.js --input <json-file> --style report --output out.md',
    '',
    'Options:',
    '  --input <path>     JSON input file. Omit to read from stdin.',
    '  --style <style>    report | square',
    '  --output <path>    Write output to file.',
    '  --title <title>    Override report title.',
    '  --chain <chain>    Override chain value.',
    '  --window <window>  Override window value.'
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

function normalizeData(raw, args = {}) {
  const validated = validateReportData(raw);
  return {
    ...validated,
    title: args.title || validated.title || '',
    chain: args.chain || validated.chain,
    window: args.window || validated.window
  };
}

function writeOutputIfNeeded(outputPath, content) {
  if (!outputPath) {
    return;
  }

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

    if (!['report', 'square'].includes(args.style)) {
      throw new Error(`Invalid style: ${args.style}. Expected "report" or "square".`);
    }

    const rawText = await readRawInput(args.input);
    const rawJson = JSON.parse(rawText);
    const data = normalizeData(rawJson, args);
    const output = args.style === 'square' ? renderSquare(data) : renderReport(data);

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
  normalizeData,
  usage
};
