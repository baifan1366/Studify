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
 * Convert price from source currency to target currency and format
 * @param priceCents - Price in cents of the source currency (e.g., 1999 = 19.99 in source currency)
 * @param sourceCurrency - Source currency code (e.g., 'MYR', 'USD')
 * @param targetCurrency - Target currency code (e.g., 'MYR', 'USD')
 * @param currencies - Array of currency data with exchange rates
 * @param locale - Locale for formatting (e.g., 'en-US', 'zh-CN')
 */
export function convertAndFormatPrice(
  priceCents: number,
  sourceCurrency: string,
  targetCurrency: string,
  currencies: Currency[],
  locale = 'en-US'
): string {
  // Convert cents to amount
  const sourceAmount = priceCents / 100;
  
  // If source and target are the same, no conversion needed
  if (sourceCurrency === targetCurrency) {
    const shouldHaveDecimals = !['JPY', 'KRW', 'VND', 'IDR'].includes(targetCurrency);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: shouldHaveDecimals ? 2 : 0,
      maximumFractionDigits: shouldHaveDecimals ? 2 : 0
    }).format(sourceAmount);
  }
  
  // Find currency data
  const sourceCurrencyData = currencies.find(c => c.code === sourceCurrency);
  const targetCurrencyData = currencies.find(c => c.code === targetCurrency);
  
  if (!sourceCurrencyData || !targetCurrencyData) {
    console.warn(`Currency conversion failed: ${sourceCurrency} -> ${targetCurrency}, using source currency`);
    const shouldHaveDecimals = !['JPY', 'KRW', 'VND', 'IDR'].includes(sourceCurrency);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: sourceCurrency,
      minimumFractionDigits: shouldHaveDecimals ? 2 : 0,
      maximumFractionDigits: shouldHaveDecimals ? 2 : 0
    }).format(sourceAmount);
  }
  
  // Convert: source -> USD -> target
  // Step 1: Convert source to USD
  const usdAmount = sourceAmount / sourceCurrencyData.rate_to_usd;
  
  // Step 2: Convert USD to target
  const targetAmount = usdAmount * targetCurrencyData.rate_to_usd;
  
  // Format the result
  const shouldHaveDecimals = !['JPY', 'KRW', 'VND', 'IDR'].includes(targetCurrency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: shouldHaveDecimals ? 2 : 0,
    maximumFractionDigits: shouldHaveDecimals ? 2 : 0
  }).format(targetAmount);
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

/**
 * Convert any currency amount to USD cents for database storage
 * @param amount - Amount in source currency (e.g., 19.99)
 * @param sourceCurrency - Source currency code (e.g., 'MYR')
 * @param currencies - Array of currency data with exchange rates
 * @returns Amount in USD cents (e.g., 1999 for $19.99)
 */
export function convertToUsdCents(
  amount: number,
  sourceCurrency: string,
  currencies: Currency[]
): number {
  if (sourceCurrency === 'USD') {
    return Math.round(amount * 100);
  }

  const currency = currencies.find(c => c.code === sourceCurrency);
  if (!currency) {
    console.warn(`Currency ${sourceCurrency} not found, treating as USD`);
    return Math.round(amount * 100);
  }

  // Convert to USD: divide by the rate
  const usdAmount = amount / currency.rate_to_usd;
  return Math.round(usdAmount * 100);
}
