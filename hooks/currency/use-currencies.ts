import { useQuery } from '@tanstack/react-query';
import { Currency, CurrencyResponse } from '@/interface/currency/currency-interface';

export const useCurrencies = () => {
  return useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: async (): Promise<Currency[]> => {
      const response = await fetch('/api/currency');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch currencies: ${response.status}`);
      }
      
      const data: CurrencyResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch currencies from API');
      }
      
      return data.currencies;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - currencies don't change that often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
  });
};
