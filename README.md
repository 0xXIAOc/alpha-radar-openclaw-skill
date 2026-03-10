# Alpha Radar OpenClaw Skill

Alpha Radar is a **GitHub-ready custom OpenClaw skill** for turning Binance market data into a stable report format.

It does not replace official Binance skills. It **orchestrates** them into five sections:

1. 今日市场主线
2. 今日值得看名单
3. 今日风险警报
4. 今日观察钱包 / 聪明钱附录
5. 今日结论

## Repo structure

```text
.
├── SKILL.md
├── package.json
├── scripts/
│   └── render-report.js
├── examples/
│   ├── sample-data.json
│   ├── sample-report.md
│   └── sample-square.txt
├── docs/
│   ├── DEMO_SCRIPT.zh-CN.md
│   ├── VIDEO_OUTLINE.zh-CN.md
│   └── SUBMISSION_CHECKLIST.zh-CN.md
└── .github/
    └── workflows/
        └── check.yml
```

## What this repository is for

Use this repository when you want to:

- install the skill locally in OpenClaw;
- upload the code to GitHub for a hackathon / challenge submission;
- show a reviewer that the project has a **clear workflow**, not just a prompt;
- generate report previews before optionally sending a short version to Binance Square.

## Install locally

Copy this repository into your local OpenClaw workspace:

```bash
mkdir -p ~/.openclaw/workspace/skills
cp -R alpha-radar-github-repo ~/.openclaw/workspace/skills/alpha-radar-report
```

Then refresh skills or restart OpenClaw.

## Add from GitHub

After you push this repo to GitHub:

```bash
openclaw skills add https://github.com/<your-name>/alpha-radar-openclaw-skill
```

## Also install official Binance skills

This repo expects the official Binance skills to be available inside OpenClaw.

```bash
npx skills add binance/binance-skills-hub
```

## Local test

```bash
npm install
npm run report
npm run square
```

Generated files:

- `examples/sample-report.md`
- `examples/sample-square.txt`

## Report data contract

The formatter expects a JSON payload like `examples/sample-data.json`.

Minimal shape:

```json
{
  "chain": "Solana",
  "window": "24h",
  "marketTheme": { "summary": "..." },
  "watchlist": [],
  "riskAlerts": [],
  "walletAppendix": { "summary": "..." },
  "conclusion": []
}
```

## Recommended OpenClaw workflow

1. User asks for a daily report.
2. OpenClaw calls official Binance skills to fetch market, token, signal, audit, and wallet data.
3. OpenClaw normalizes those raw results into the JSON schema used here.
4. OpenClaw runs `scripts/render-report.js`.
5. OpenClaw returns a preview.
6. If the user wants a Binance Square post, OpenClaw renders the `square` style and posts only after confirmation.

## Security notes

- Do **not** hardcode API keys in this repository.
- Keep Square posting keys and exchange API keys out of Git.
- Default to **preview first**, then publish.

## Demo materials included

See:

- `docs/DEMO_SCRIPT.zh-CN.md`
- `docs/VIDEO_OUTLINE.zh-CN.md`
- `docs/SUBMISSION_CHECKLIST.zh-CN.md`

## Suggested GitHub repo name

`alpha-radar-openclaw-skill`

## Suggested Git commit flow

```bash
git init
git add .
git commit -m "feat: initial Alpha Radar OpenClaw skill"
git branch -M main
git remote add origin https://github.com/<your-name>/alpha-radar-openclaw-skill.git
git push -u origin main
```
