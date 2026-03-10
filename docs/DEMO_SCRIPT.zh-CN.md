# 演示脚本（适合录屏 60-90 秒）

## 开场
- 展示仓库首页：README、SKILL.md、scripts、examples、docs 都在。
- 一句话介绍：这不是一个“再问一次 AI”的 prompt，而是一个固定格式的研究工作流。

## 第一步：展示 Skill 结构
- 打开 `SKILL.md`
- 强调 5 个固定栏目：
  1. 今日市场主线
  2. 今日值得看名单
  3. 今日风险警报
  4. 今日观察钱包 / 聪明钱附录
  5. 今日结论

## 第二步：展示输入数据模板
- 打开 `examples/sample-data.json`
- 说明：这个 JSON 会由 OpenClaw + Binance 官方 Skills 产出，当前仓库只负责把原始数据变成稳定报告。

## 第三步：本地运行
```bash
npm install
npm run report
npm run square
```
- 展示生成的 `examples/sample-report.md`
- 展示生成的 `examples/sample-square.txt`

## 第四步：讲清楚价值
- 不是凭空写内容，而是基于真实数据输出固定结构。
- 钱包观察不再是全文主角，只作为附录证据。
- Square 发文前先预览，再决定是否发布。

## 收尾
- 打开 README 最后的 GitHub 推送命令。
- 强调：仓库可直接上传 GitHub，用于项目审核与演示。
