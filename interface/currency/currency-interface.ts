export interface Currency {
  id: number;
  code: string;
  name: string;
  country: string;
  symbol: string;
  rate_to_usd: number;
  updated_at: string;
}

export interface CurrencyResponse {
  success: boolean;
  currencies: Currency[];
}

export interface CurrencyUpdateResponse {
  success: boolean;
  message: string;
  action: 'created' | 'updated';
  count: number;
  rates: Record<string, number>;
  updatedRates?: Array<{ code: string; rate: number }>;
}
