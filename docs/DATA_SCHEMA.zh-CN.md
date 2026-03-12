# DATA_SCHEMA.zh-CN

下面是当前渲染器实际使用的数据结构。

## 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 报告标题，可选 |
| `queryType` | `market \| token \| help` | 报告类型 |
| `mode` | `tg \| report \| square` | 输出样式 |
| `chainScope` | `auto \| global \| solana \| bsc \| base \| eth \| ethereum \| custom` | 范围 |
| `selectedChains` | `string[]` | 当 scope 为 auto/global 时可显示已选链 |
| `previewOnly` | `boolean` | 是否预览模式 |
| `chain` | `string` | 人类可读链标签 |
| `window` | `string` | 时间窗口，如 `24h` |
| `generatedAt` | `string` | 生成时间 |
| `upstreamCalls` | `UpstreamCall[]` | 上游调用状态 |
| `marketTheme` | `object` | 市场主线 |
| `spotLeaderboards` | `object` | 现货涨跌榜 |
| `leaderboards` | `object` | 交易所热度 / 钱包热度 |
| `memeRadar` | `object` | Meme 雷达 |
| `futuresSentiment` | `object` | 衍生品情绪 |
| `watchlist` | `WatchlistItem[]` | 值得看名单 / token 详情主体 |
| `riskAlerts` | `RiskAlert[]` | 风险提示 |
| `walletAppendix` | `object` | 钱包附录 |
| `conclusion` | `string[]` | 结论列表 |
| `helpCards` | `HelpCard[]` | 帮助卡片 |

## preferences

```json
{
  "profile": "balanced",
  "risk": "balanced",
  "topN": 3,
  "lang": "zh",
  "wallet": true,
  "preview": true,
  "showSpotLeaderboards": true,
  "showExchangeHot": true,
  "showWalletHot": true,
  "showMemeRadar": true,
  "squareDisclosureEnabled": false,
  "squareDisclosureAskEveryTime": true
}
```

## tokenQuery

```json
{
  "symbol": "ROBO",
  "token": "ROBO",
  "contractAddress": "0x123...",
  "chain": "Base"
}
```

## futuresSentiment

```json
{
  "summary": "衍生品情绪整体偏多，但还没有形成全面共振。",
  "panels": [
    {
      "symbol": "BTCUSDT",
      "globalLongShortRatio": 1.03,
      "topLongShortRatio": 1.22,
      "openInterestValue": "386545621",
      "openInterestChangePct": 3.21,
      "fundingRate": 0.000112,
      "takerBuySellRatio": 1.08,
      "stance": "多头偏强"
    }
  ]
}
```

## watchlist item

```json
{
  "symbol": "ROBO",
  "chain": "Base",
  "action": "看",
  "score": 88,
  "confidence": "high",
  "reason": "热度、成交和钱包流入形成共振。",
  "metrics": {
    "price": "$0.028",
    "priceChange24h": "+126.4%",
    "volume24h": "$82M"
  },
  "risk": "涨幅过大，若成交断层容易剧烈回撤。",
  "next": "继续看新钱包增量和回调后承接。",
  "sourceFlags": ["spot", "wallet-hot"]
}
```

## upstreamCalls

允许状态：

- `ok`
- `partial`
- `failed`
- `skipped`

`render.js` 会根据这里的状态显示失败提示或 fallback 文案。
