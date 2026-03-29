import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { WidgetDefinition, WidgetProps } from './types';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// Static demo data — Yahoo Finance API blocks CORS from browsers.
// In production, this would be fetched via a server-side proxy.
const DEMO_QUOTES: StockQuote[] = [
  { symbol: 'AAPL', price: 227, change: 1.34, changePercent: 0.59 },
  { symbol: 'GOOGL', price: 178, change: -0.82, changePercent: -0.46 },
  { symbol: 'MSFT', price: 415, change: 2.18, changePercent: 0.53 },
];

function StocksWidgetComponent({ width, height }: WidgetProps) {
  const [quotes] = useState<StockQuote[]>(DEMO_QUOTES);

  return (
    <div
      style={{
        width, height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '14px 20px',
        gap: 10,
      }}
    >
      {quotes.map((q) => (
        <div
          key={q.symbol}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-inverse)', minWidth: 60 }}>
            {q.symbol}
          </span>
          <span style={{ fontSize: 'var(--font-size-lg)', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
            ${q.price.toFixed(0)}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              color: q.change >= 0
                ? 'rgba(134,239,172,0.9)'
                : 'rgba(251,113,133,0.9)',
            }}
          >
            {q.change >= 0 ? '+' : ''}{q.changePercent.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export const stocksWidget: WidgetDefinition = {
  id: 'stocks',
  name: 'Stocks',
  description: 'Quick glance at stock prices (demo data)',
  icon: TrendingUp,
  defaultEnabled: false,
  component: StocksWidgetComponent,
};
