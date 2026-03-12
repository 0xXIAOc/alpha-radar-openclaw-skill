#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sample = path.join(root, 'examples', 'sample-data.json');

function run(args) {
  const result = spawnSync('node', [path.join(root, 'scripts', 'render-report.js'), ...args], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Command failed: ${args.join(' ')}`);
  }

  return result.stdout;
}

function write(file, text) {
  fs.writeFileSync(path.join(root, 'examples', file), text, 'utf8');
}

function main() {
  const report = run(['--input', sample, '--style', 'report']);
  const square = run(['--input', sample, '--style', 'square']);
  const tg = run(['--input', sample, '--style', 'tg']);

  write('sample-report.md', report);
  write('sample-square.txt', square);
  write('sample-tg.txt', tg);

  process.stdout.write('Smoke OK\n');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`[smoke] ${error.message}\n`);
    process.exit(1);
  }
}
