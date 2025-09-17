import { Currency } from '@/interface/currency/currency-interface';

/**
 * Convert USD amount to target currency using provided currencies data
 */
export function convertCurrency(
  usdAmount: number,
  targetCurrency: string,
  currencies: Currency[]
): number {
  if (targetCurrency === 'USD') {
    return usdAmount;
  }

  const currency = currencies.find(c => c.code === targetCurrency);
  if (!currency) {
    console.warn(`Currency ${targetCurrency} not found, returning USD amount`);
    return usdAmount;
  }

  return usdAmount * currency.rate_to_usd;
}

/**
 * Convert and format price with proper currency symbol and formatting
 */
export function convertAndFormatPrice(
  usdCents: number,
  targetCurrency: string,
  currencies: Currency[],
  locale = 'en-US'
): string {
  const usdAmount = usdCents / 100;
  const convertedAmount = convertCurrency(usdAmount, targetCurrency, currencies);
  
  const currency = currencies.find(c => c.code === targetCurrency);
  if (!currency) {
    // Fallback to basic USD formatting
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD'
    }).format(usdAmount);
  }

  // Handle currencies without decimal places
  const shouldHaveDecimals = !['JPY', 'KRW', 'VND', 'IDR'].includes(targetCurrency);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: shouldHaveDecimals ? 2 : 0,
    maximumFractionDigits: shouldHaveDecimals ? 2 : 0
  }).format(convertedAmount);
}

/**
 * Get currency symbol from currencies data
 */
export function getCurrencySymbol(currencyCode: string, currencies: Currency[]): string {
  const currency = currencies.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * Get supported currencies list for dropdown/selector
 */
export function getSupportedCurrencies(currencies: Currency[]) {
  return currencies.map(currency => ({
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
    country: currency.country
  }));
}
