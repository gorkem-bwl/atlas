import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

// In-memory cache (5 minute TTL)
let cache: { data: StockQuote[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

async function fetchQuotes(): Promise<StockQuote[]> {
  // Use Yahoo Finance v8 API (no key required, server-side only)
  const results: StockQuote[] = [];

  // Fetch each symbol via Yahoo v8 chart API (still works, no key needed)
  for (const symbol of SYMBOLS) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Atlas/1.0)' } }
      );
      if (!res.ok) continue;
      const json = await res.json() as any;
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        results.push({ symbol, price, change, changePercent });
      }
    } catch {
      // Skip this symbol
    }
  }

  // If Yahoo failed for all, try finnhub as fallback
  if (results.length === 0) {
    for (const symbol of SYMBOLS.slice(0, 3)) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=demo`);
        if (res.ok) {
          const q = await res.json() as any;
          if (q.c) {
            results.push({
              symbol,
              price: q.c,
              change: q.d ?? 0,
              changePercent: q.dp ?? 0,
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  return results;
}

router.get('/quotes', async (_req: Request, res: Response) => {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      res.json({ success: true, data: cache.data });
      return;
    }

    const quotes = await fetchQuotes();
    if (quotes.length > 0) {
      cache = { data: quotes, ts: Date.now() };
    }

    res.json({ success: true, data: quotes });
  } catch (error) {
    logger.error({ error }, 'Failed to get stock quotes');
    res.status(500).json({ success: false, error: 'Failed to fetch stock data' });
  }
});

export default router;
