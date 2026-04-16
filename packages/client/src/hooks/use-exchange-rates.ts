import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface ConversionResult {
  from: string;
  to: string;
  rate: number;
  amount: number;
  converted: number;
  provider: string;
  cached: boolean;
}

export function useConvertCurrency(
  from: string | undefined,
  to: string | undefined,
  amount: number,
) {
  const query = useQuery({
    queryKey: ['exchange-rates', 'rate', from, to],
    queryFn: async () => {
      const { data } = await api.get('/exchange-rates/convert', {
        params: { from, to, amount: 1 },
      });
      return data.data as ConversionResult;
    },
    enabled: !!from && !!to && from !== to && amount > 0,
    staleTime: 60 * 60 * 1000, // 1 hour — rates don't change often
    retry: 1,
  });

  // Derive converted amount client-side so different amounts share one cached rate
  const converted = query.data ? Math.round(amount * query.data.rate * 100) / 100 : undefined;

  return { ...query, data: query.data ? { ...query.data, amount, converted } : undefined };
}
