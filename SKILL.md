---
name: alpha
description: Use this skill when the user asks to generate a Binance daily market report, BSC/Base/Solana report, global report, Watchlist Delta Report, Alpha Radar report, token report, risk alert report, smart money appendix, or Binance Square preview. Trigger strongly on Chinese requests like “生成今日日报”, “按 Alpha Radar 模板生成日报”, “生成全网 watchlist”, “生成风险警报”, “生成 Binance Square 预览”, “只预览不发广场”, “给我一个短版”, “给我一个 TG 版”, “查询ROBO的信息”, “查询代币ROBO”, “查一下ROBO”, “ROBO怎么样”, “全网广场版前3”.
metadata: {"version":"1.0.0","author":"0xXIAOc","openclaw":{"requires":{"bins":["node"]},"emoji":"📊","homepage":"https://github.com/0xXIAOc/alpha-radar-openclaw-skill"}}
homepage: https://github.com/0xXIAOc/alpha-radar-openclaw-skill
user-invocable: true
---

# Alpha Radar Report v1.0

## Default behavior

When invoked without detailed arguments, default to:

- mode: `tg`
- scope: `auto`
- queryType: `market`
- window: `24h`
- previewOnly: `true`
- profile: `balanced`
- topN: `3`
- lang: `zh`

Meaning:
- 默认短版
- 默认多链
- 默认预览
- 默认评分化
- 默认不追问

## Scope definitions

- `solana`: only Solana
- `bsc`: only BSC
- `base`: only Base
- `auto`: compare Solana / BSC / Base first, then merge into one report
- `global`: use all available supported chains from upstream Binance skills, then output one merged report

If the user does not specify a chain, prefer `auto`.

## Query types

- `market`: 全网 / 分链市场报告
- `token`: 指定代币 / 指定合约报告

If the user provides any of the following, switch to `token` mode:
- `代币=...`
- `币种=...`
- `token=...`
- `symbol=...`
- `合约=...`
- `contract=...`
- 自然中文句式，例如：
  - `查询ROBO的信息`
  - `查询代币ROBO`
  - `查一下ROBO`
  - `看看ROBO`
  - `ROBO怎么样`

## Mode definitions

- `tg`: short Telegram-friendly preview
- `report`: full research report
- `square`: concise Binance Square preview, directly postable pure text

If the user does not specify a mode, prefer `tg`.

## Chinese aliases

Interpret these naturally:

### 范围
- `全网` = `scope=global`
- `自动` = `scope=auto`
- `solana` / `索拉纳` = `scope=solana`
- `bsc` = `scope=bsc`
- `base` = `scope=base`

### 模式
- `预览` / `短版` / `TG版` = `mode=tg`
- `完整版` / `长版` = `mode=report`
- `广场版` / `Square版` = `mode=square`

### 风格
- `谨慎` = `profile=cautious`
- `均衡` = `profile=balanced`
- `激进` = `profile=aggressive`

### 钱包
- `钱包开` / `看钱包` = `wallet=on`
- `钱包关` / `不看钱包` = `wallet=off`

### 显示模块
- `现货开` / `现货关`
- `热度开` / `热度关`
- `钱包热度开` / `钱包热度关`
- `meme开` / `meme关`

### 数量
- `前3` = `top=3`
- `前5` = `top=5`

### 广场署名
- `署名开` = `squareDisclosureEnabled=true`
- `署名关` = `squareDisclosureEnabled=false`
- `每次询问` = `squareDisclosureAskEveryTime=true`
- `不再询问` / `记住设置` = `squareDisclosureAskEveryTime=false`

### 指定代币
- `代币=CAKE`
- `币种=PEPE`
- `合约=0x123...`
- `链=bsc`

## Purpose

Alpha Radar turns upstream Binance skill outputs into a stable research workflow.

It has two major modes:

### 1. Market mode
Outputs:
1. 主线一句话
2. 现货涨幅前三
3. 现货跌幅前三
4. 交易所热度前三
5. 钱包热度前三
6. Meme 雷达
7. 值得看 Top
8. 风险
9. 结论

### 2. Token mode
Outputs:
1. 代币概览
2. 关键信号
3. 风险提示
4. 结论

This skill should prioritize real upstream Binance skill calls in the current turn before writing any report.

## Slash command behavior

The short slash command for this skill should be:

- `/alpha`

Examples:
- `/alpha`
- `/alpha 全网`
- `/alpha base`
- `/alpha 代币=ROBO`
- `/alpha 广场版 前3`
- `/alpha 全网 广场版 署名关 不再询问`

## Natural chat behavior

This skill should also be considered during normal Chinese chat requests such as:

- `查询ROBO的信息`
- `查询代币ROBO`
- `查一下ROBO`
- `ROBO怎么样`
- `全网广场版前3`
- `BSC 谨慎 钱包关`
- `Base 热度前三`

If the user provides enough information in a normal message, do not force them to restate it as a slash command.

## Strong invocation rule

When the user invokes this skill directly via slash command or `/skill alpha`, treat it as a hard request to run the Alpha Radar workflow now.

Do not respond as generic chat first.
Do not ask a follow-up if the command already contains enough information.
If the command is bare `/alpha`, run the default workflow immediately.

## Required upstream skills

Before writing any report, you MUST attempt to use these upstream skills when they are available in the environment:

1. `spot`
2. `crypto-market-rank`
3. `query-token-info`
4. `trading-signal`
5. `query-token-audit`

Optional enrichment:
6. `query-address-info`
7. `meme-rush`
8. `square-post`

## Core feature mapping

Use upstream skills like this:

- `spot`
  - 现货涨幅前三
  - 现货跌幅前三

- `crypto-market-rank`
  - 交易所热度前三
  - 钱包热度前三（Smart Money Inflow）
  - Trending / Top Search / Social Hype

- `query-token-info + query-token-audit + trading-signal`
  - 指定代币体检卡

- `meme-rush`
  - Meme 雷达

- `square-post`
  - Binance Square 发文

## TG mode rules

In `tg` mode, the output should feel like a trader dashboard, not a long research article.

Prefer this structure:

- 标题
- 主线一句话
- 现货涨幅前三
- 现货跌幅前三
- 交易所热度前三
- 钱包热度前三
- Meme 雷达
- 值得看 Top
- 风险
- 一句话结论

Do not append “如果你要，我下一条可以继续……” unless the user explicitly asks for follow-ups.

## Non-negotiable execution policy

- Do not say “官方 Binance 热度榜数据未接入” unless you actually failed to call `crypto-market-rank` in this turn.
- Do not say “Smart Money 信号数据未接入” unless you actually failed to call `trading-signal` in this turn.
- Do not say “链上风控与钱包附录数据未接入” unless you actually failed to call `query-token-audit` or `query-address-info` in this turn.
- Do not output a fake or generic market report when upstream skills are available.
- If upstream skills are available, attempt them first.
- If one upstream skill fails, continue with the remaining available skills instead of aborting the whole report.
- In `tg` and `square` mode, avoid verbose engineering wording.
- Only show failed upstream call details when they materially affect the result.

## Required fallback wording

If fallback is necessary, use this wording style:

- 本轮未成功调用 `spot`
- 本轮未成功调用 `crypto-market-rank`
- 本轮未成功调用 `trading-signal`
- 本轮未成功调用 `query-token-audit`
- 本轮未成功调用 `query-address-info`

Never use vague wording like “数据未接入” if the real issue is “this turn did not successfully call the upstream skill”.

## Square disclosure rule

When `mode=square` and the user asks to generate or publish a Square draft:

- If `squareDisclosureAskEveryTime=true` and the user did not explicitly specify `署名开` or `署名关`, ask once:
  - “本次广场文案开头要不要加：本文由OpenClaw发出？”
- If `squareDisclosureAskEveryTime=false`, follow the stored/default preference directly.
- If `squareDisclosureEnabled=true`, prepend:
  - `本文由OpenClaw发出`
- If `squareDisclosureEnabled=false`, do not prepend it.

## Standard workflow

### Step 1: Read request scope
Infer or read:
- `queryType`: `market` or `token`
- `scope`: `solana | bsc | base | auto | global`
- `window`: default `24h`
- `mode`: `tg | report | square`
- `preferences`:
  - `profile`
  - `risk`
  - `top`
  - `lang`
  - `wallet`
  - `preview`
  - `showSpotLeaderboards`
  - `showExchangeHot`
  - `showWalletHot`
  - `showMemeRadar`
  - `squareDisclosureEnabled`
  - `squareDisclosureAskEveryTime`
- token fields if present:
  - `token`
  - `contract`
  - `chain`

### Step 2: Run upstream Binance skill calls
Use the required upstream skills in this order:

1. `spot`
2. `crypto-market-rank`
3. `query-token-info`
4. `trading-signal`
5. `query-token-audit`
6. `query-address-info`
7. `meme-rush`
8. `square-post`

### Step 3: Build normalized report data

For market mode include:
- `queryType`
- `mode`
- `chainScope`
- `selectedChains`
- `previewOnly`
- `preferences`
- `chain`
- `window`
- `generatedAt`
- `upstreamCalls`
- `marketTheme`
- `spotLeaderboards`
- `leaderboards`
- `memeRadar`
- `watchlist`
- `riskAlerts`
- `walletAppendix`
- `conclusion`

For token mode include:
- `queryType`
- `tokenQuery`
- `mode`
- `previewOnly`
- `preferences`
- `chain`
- `window`
- `generatedAt`
- `upstreamCalls`
- `watchlist`
- `riskAlerts`
- `conclusion`

### Step 4: Render report

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

## Output discipline

- Prefer short actionable output in `tg` mode.
- Prefer expanded explanation in `report` mode.
- Prefer posting-friendly copy in `square` mode.
- Never ask the user to repeat the chain unless truly ambiguous.
- Never pretend upstream data was used when it was not.
- Never silently skip upstream Binance skills when they are available.
- If all required upstream skills fail, output a clearly labeled fallback preview, not a fake finished report.

## Square mode rules

In `square` mode:
- Do not output long sections like “本轮已依次调用……”
- Do not output verbose engineering wording
- Prefer a directly postable format:
  - 标题
  - 主线
  - 现货涨幅前三
  - 现货跌幅前三
  - 交易所热度前三
  - 钱包热度前三
  - Meme 雷达（如有）
  - Top 3
  - 风险
  - 结论
  - DYOR
- Keep it readable as a standalone pure-text Binance Square post

## Publish safety

- Never publish to Binance Square unless the user explicitly asks to publish.
- Preview first by default.
- Even after generating a Square draft, do not publish without confirmation.
