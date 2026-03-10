'use strict';

const { z } = require('zod');

const MetricsSchema = z
  .object({
    price: z.union([z.string(), z.number()]).optional(),
    volume24h: z.union([z.string(), z.number()]).optional(),
    liquidity: z.union([z.string(), z.number()]).optional(),
    holders: z.union([z.string(), z.number()]).optional(),
    top10Pct: z.union([z.string(), z.number()]).optional(),
    smartMoney: z.string().optional(),
    riskLevel: z.string().optional()
  })
  .default({});

const WatchlistItemSchema = z.object({
  symbol: z.string().optional(),
  name: z.string().optional(),
  verdict: z.string().optional(),
  reason: z.string().optional(),
  metrics: MetricsSchema.optional(),
  risk: z.string().optional(),
  next: z.string().optional()
});

const RiskAlertSchema = z.object({
  symbol: z.string().optional(),
  name: z.string().optional(),
  reason: z.string().optional(),
  flags: z.array(z.string()).optional()
});

const ReportDataSchema = z.object({
  title: z.string().optional(),
  chain: z.string().default('Unknown'),
  window: z.string().default(''),
  generatedAt: z.string().optional(),
  marketTheme: z
    .object({
      summary: z.string().optional(),
      signals: z.array(z.string()).optional(),
      stance: z.string().optional()
    })
    .default({}),
  watchlist: z.array(WatchlistItemSchema).default([]),
  riskAlerts: z.array(RiskAlertSchema).default([]),
  walletAppendix: z
    .object({
      summary: z.string().optional(),
      notes: z.array(z.string()).optional()
    })
    .default({}),
  conclusion: z.array(z.string()).default([])
});

function validateReportData(input) {
  const result = ReportDataSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid report data: ${issues}`);
  }
  return result.data;
}

module.exports = {
  ReportDataSchema,
  validateReportData
};
