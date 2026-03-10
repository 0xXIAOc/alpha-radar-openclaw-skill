---
name: alpha-radar-report
description: Generate a structured market report (market theme, watchlist, risk alerts, smart money appendix, conclusion) from Binance skills data, with an optional Binance Square draft.
metadata: {"version":"0.3.0","author":"0xXIAOc","homepage":"https://github.com/0xXIAOc/alpha-radar-openclaw-skill"}
user-invocable: true
---

# Alpha Radar Report

Use this skill when the user wants any of the following:

- 生成日报 / 周报 / Watchlist Delta Report
- 按固定栏目整理 Binance 数据
- 输出 Binance Square 可发布文案
- 把热点主线、值得看名单、风险警报整理成一页报告

## Goal

Turn noisy market data into a repeatable and easy-to-read report.

This skill is an orchestrator. It should reuse installed official Binance skills for data collection, then normalize the raw results into the schema used by this repository, then render the final report with the local formatter.

## Data collection order

When available, gather data in this order:

1. Crypto Market Rank
2. Query Token Info
3. Trading Signal
4. Query Token Audit
5. Query Address Info (appendix only)
6. Binance Spot (optional confirmation layer)
7. Square Post (optional publish step)

## Safety rules

- Never present the report as investment advice.
- Never predict price with certainty.
- Wallet observation must stay in the appendix, not as the report headline.
- If data conflicts, say `存在分歧`.
- If data is missing, say `数据不足，暂不下结论`.
- Always preview before publishing unless the user explicitly requests immediate posting.

## Standard report sections

Always output these sections in order:

1. 今日市场主线
2. 今日值得看名单
3. 今日风险警报
4. 今日观察钱包 / 聪明钱附录
5. 今日结论

## Working procedure

1. Read target chain and time window from the user. Defaults: `Solana`, `24h`.
2. Call official Binance skills to gather raw data.
3. Build a JSON object that matches `examples/sample-data.json`.
4. Save it to a temporary file **or** pipe it directly to stdin.
5. Run one of the following:

### Report mode

```bash
node {baseDir}/scripts/render-report.js --input <json-path> --style report
```

or

```bash
cat <json-path> | node {baseDir}/scripts/render-report.js --style report
```

### Binance Square preview mode

```bash
node {baseDir}/scripts/render-report.js --input <json-path> --style square
```

or

```bash
cat <json-path> | node {baseDir}/scripts/render-report.js --style square
```

6. Return the rendered output.
7. Publish only after user confirmation.

## Writing guidance

### 今日市场主线

- Summarize what the market is actually paying attention to.
- Separate search heat, social heat, and smart-money flow.
- End with one stance: 更偏追热 / 观察确认 / 风险控制.

### 今日值得看名单

- Keep 3 to 5 names at most.
- For each name include:
  - 结论
  - 入选理由
  - 关键数据
  - 当前风险点
  - 下一步观察点

### 今日风险警报

- Prefer concrete warnings: high tax, high-risk contract, weak liquidity, too few holders, concentrated ownership, expired signal.

### 今日观察钱包 / 聪明钱附录

- Treat wallet behavior as supporting evidence only.
- Note whether multiple addresses show consensus.
- Explicitly point out when wallet data conflicts with broader market attention.

### 今日结论

- 3 to 5 concise lines.
- Summarize the opportunity type worth watching.
- Summarize the risk type worth avoiding.
- End with a DYOR-style reminder.
