---
name: alpha-radar-report
description: Use this skill when the user asks to generate a Binance daily market report, Solana/BSC report, global report, Watchlist Delta Report, Alpha Radar report, risk alert report, smart money appendix, or Binance Square preview. Trigger strongly on requests like “生成今日日报”, “按 Alpha Radar 模板生成日报”, “生成全网 watchlist”, “生成风险警报”, “生成 Binance Square 预览”, “只预览不发广场”, “给我一个短版”, “给我一个 TG 版”.
metadata: {"version":"0.6.0","author":"0xXIAOc","openclaw":{"requires":{"bins":["node"]},"emoji":"📊","homepage":"https://github.com/0xXIAOc/alpha-radar-openclaw-skill"}}
homepage: https://github.com/0xXIAOc/alpha-radar-openclaw-skill
user-invocable: true
---

# Alpha Radar Report v2

## Default behavior

When invoked without detailed arguments, default to:

- mode: `tg`
- scope: `auto`
- window: `24h`
- previewOnly: `true`

Meaning:
- **默认短版**
- **默认多链**
- **默认预览**
- **默认评分化**

## Scope definitions

- `solana`: only Solana
- `bsc`: only BSC
- `auto`: compare Solana and BSC first, then merge into one report
- `global`: use all available chains from upstream Binance skills, then output one merged report

If the user does not specify a chain, prefer `auto`.

## Mode definitions

- `tg`: short Telegram-friendly preview
- `report`: full research report
- `square`: concise Binance Square preview

If the user does not specify a mode, prefer `tg`.

## Purpose

Alpha Radar turns upstream Binance skill outputs into a stable research workflow with five sections:

1. 今日市场主线
2. 今日值得看名单
3. 今日风险警报
4. 今日观察钱包 / 聪明钱附录
5. 今日结论

This skill should prioritize **real upstream Binance skill calls in the current turn** before writing any report.

## Strong invocation rule

When the user invokes this skill directly via slash command or `/skill alpha_radar_report`, treat it as a hard request to run the Alpha Radar workflow now.

Do not respond as generic chat first.
Do not start with a template-only placeholder report unless upstream Binance skill calls have actually been attempted in this turn.

## Required upstream skills

Before writing any report, you MUST attempt to use these upstream skills when they are available in the environment:

1. `crypto-market-rank`
2. `query-token-info`
3. `trading-signal`
4. `query-token-audit`

Optional enrichment:
5. `query-address-info`
6. `spot`
7. `square-post`

## Non-negotiable execution policy

- Do not say “官方 Binance 热度榜数据未接入” unless you actually failed to call `crypto-market-rank` in this turn.
- Do not say “Smart Money 信号数据未接入” unless you actually failed to call `trading-signal` in this turn.
- Do not say “链上风控与钱包附录数据未接入” unless you actually failed to call `query-token-audit` or `query-address-info` in this turn.
- Do not output a fake or generic market report when upstream skills are available.
- If upstream skills are available, attempt them first.
- If one upstream skill fails, continue with the remaining available skills instead of aborting the whole report.
- If a fallback preview is required, explicitly name which upstream skill failed.

## Required fallback wording

If fallback is necessary, use this wording style:

- 本轮未成功调用 `crypto-market-rank`
- 本轮未成功调用 `trading-signal`
- 本轮未成功调用 `query-token-audit`
- 本轮未成功调用 `query-address-info`

Never use vague wording like “数据未接入” if the real issue is “this turn did not successfully call the upstream skill”.

## Standard workflow

### Step 1: Read request scope
Infer or read:
- target scope:
  - `solana`
  - `bsc`
  - `auto`
  - `global`
- time window (default: `24h`)
- mode:
  - `tg`
  - `report`
  - `square`
- whether the user wants:
  - report preview
  - square preview
  - publish after confirmation

### Step 2: Run upstream Binance skill calls
Use the required upstream skills in this order:

1. `crypto-market-rank`
   - find trending / top search / attention candidates
2. `query-token-info`
   - enrich candidates with market structure
3. `trading-signal`
   - check smart money activity
4. `query-token-audit`
   - check risk and contract safety
5. `query-address-info`
   - only for appendix evidence
6. `spot`
   - optional exchange-side confirmation
7. `square-post`
   - only after explicit confirmation

### Step 3: Build normalized report data
Construct a normalized JSON object matching the repository schema.

It should contain:

- `mode`
- `chainScope`
- `selectedChains`
- `previewOnly`
- `chain`
- `window`
- `generatedAt`
- `upstreamCalls`
- `marketTheme`
- `watchlist`
- `riskAlerts`
- `walletAppendix`
- `conclusion`

### Step 4: Render report
Use the local formatter.

For Telegram-friendly short preview:

```bash
node {baseDir}/scripts/render-report.js --input <json-path> --style tg
```

For full report:

```bash
node {baseDir}/scripts/render-report.js --input <json-path> --style report
```

For Square preview:

```bash
node {baseDir}/scripts/render-report.js --input <json-path> --style square
```

## Report quality rules

### 今日市场主线
- Must be based on actual market attention data from this turn.
- Separate:
  - search heat
  - social/attention heat
  - smart-money flow
- End with one stance:
  - 更偏追热
  - 观察确认
  - 风险控制

### 今日值得看名单
- Prefer a scored shortlist.
- Each token should include:
  - score
  - confidence
  - action
  - source flags
  - key reason
  - current risk
- `tg` mode: at most 3 names
- `report` mode: at most 5 names
- If only 1–2 names meet the threshold, output only 1–2 names.

### 今日风险警报
- Prefer concrete warnings:
  - high tax
  - high-risk contract
  - weak liquidity
  - too few holders
  - concentrated ownership
  - expired signal
- Separate:
  - 合约风险
  - 交易风险

### 今日观察钱包 / 聪明钱附录
- Wallet behavior is supporting evidence only.
- It must not become the headline of the report.
- If `query-address-info` was not run, say:
  - 本轮未成功调用 `query-address-info`，因此附录仅保留为空或简化说明。

### 今日结论
- Keep it short and decision-focused.
- `tg` mode: 2–4 lines
- `report` mode: 3–5 lines
- Always end with:
  - DYOR。以上仅为研究整理，不构成任何建议。

## Output discipline

- Prefer short actionable output in `tg` mode.
- Prefer expanded explanation in `report` mode.
- Prefer posting-friendly copy in `square` mode.
- Never ask the user to repeat the chain unless truly ambiguous.
- Never pretend upstream data was used when it was not.
- Never silently skip upstream Binance skills when they are available.
- If all required upstream skills fail, output a clearly labeled fallback preview, not a fake finished report.

## Shorthand intent examples

Interpret these naturally:

- `/alpha_radar_report`
  - default to `tg + auto + 24h + preview`
- `/alpha_radar_report global`
  - `tg + global + 24h + preview`
- `/alpha_radar_report report`
  - `report + auto + 24h + preview`
- `/alpha_radar_report bsc`
  - `tg + bsc + 24h + preview`
- `/alpha_radar_report square`
  - `square + auto + 24h + preview`

## Publish safety

- Never publish to Binance Square unless the user explicitly asks to publish.
- Preview first by default.
- Even after generating a Square draft, do not publish without confirmation.
