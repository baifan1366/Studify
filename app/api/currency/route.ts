import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

// Currency list with all required information
const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', country: 'United States', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', country: 'Malaysia', symbol: 'RM' },
  { code: 'EUR', name: 'Euro', country: 'European Union', symbol: '€' },
  { code: 'GBP', name: 'British Pound Sterling', country: 'United Kingdom', symbol: '£' },
  { code: 'SGD', name: 'Singapore Dollar', country: 'Singapore', symbol: 'S$' },
  { code: 'PHP', name: 'Philippine Peso', country: 'Philippines', symbol: '₱' },
  { code: 'THB', name: 'Thai Baht', country: 'Thailand', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', country: 'Indonesia', symbol: 'Rp' },
  { code: 'VND', name: 'Vietnamese Dong', country: 'Vietnam', symbol: '₫' },
  { code: 'CNY', name: 'Chinese Yuan', country: 'China', symbol: '¥' },
  { code: 'JPY', name: 'Japanese Yen', country: 'Japan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', country: 'South Korea', symbol: '₩' },
];

// GET - Fetch all currencies from database
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: currencies, error } = await supabase
      .from('currencies')
      .select('*')
      .order('code');

    if (error) {
      console.error('[Currency API] Error fetching currencies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch currencies' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      currencies: currencies || []
    });
  } catch (error) {
    console.error('[Currency API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update exchange rates from exchangerate.host
async function handler(req: Request) {
  try {
    console.log('[Currency API] Starting exchange rate update...');
    
    const apiKey = process.env.EXCHANGE_RATE_API_ACCESS_KEY;
    if (!apiKey) {
      console.error('[Currency API] Missing EXCHANGE_RATE_API_ACCESS_KEY');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Check if currencies table has any records
    const { data: existingCurrencies, error: checkError } = await supabase
      .from('currencies')
      .select('id, code')
      .limit(1);

    if (checkError) {
      console.error('[Currency API] Error checking existing currencies:', checkError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const isFirstDay = !existingCurrencies || existingCurrencies.length === 0;
    console.log(`[Currency API] First day check: ${isFirstDay ? 'TRUE - Creating records' : 'FALSE - Updating records'}`);

    // Fetch exchange rates from exchangerate.host using live endpoint
    const symbols = SUPPORTED_CURRENCIES.map(c => c.code).join(',');
    const exchangeRateUrl = `http://api.exchangerate.host/live?access_key=${apiKey}&currencies=${symbols}&source=USD&format=1`;
    
    console.log('[Currency API] Fetching rates from exchangerate.host...');
    const response = await fetch(exchangeRateUrl);
    
    if (!response.ok) {
      console.error('[Currency API] Exchange rate API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Exchange rate API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('[Currency API] Exchange rate API returned error:', data.error);
      return NextResponse.json(
        { error: 'Exchange rate API error: ' + (data.error?.info || 'Unknown error') },
        { status: 500 }
      );
    }

    // Convert live quotes to rates format (quotes like USDMYR, USDEUR to direct rates)
    const rates: { [key: string]: number } = {};
    if (data.quotes) {
      Object.entries(data.quotes).forEach(([pair, rate]) => {
        // Extract currency code from pair (e.g., USDMYR -> MYR)
        const currency = pair.slice(3); // Remove 'USD' prefix
        rates[currency] = rate as number;
      });
    }
    rates['USD'] = 1.0; // USD base rate

    console.log('[Currency API] Successfully fetched exchange rates');

    if (isFirstDay) {
      // First day: Create all currency records
      console.log('[Currency API] Creating initial currency records...');
      
      const currencyRecords = SUPPORTED_CURRENCIES.map(currency => ({
        code: currency.code,
        name: currency.name,
        country: currency.country,
        symbol: currency.symbol,
        rate_to_usd: currency.code === 'USD' ? 1.0 : (rates[currency.code] || 1.0)
      }));

      const { data: insertedCurrencies, error: insertError } = await supabase
        .from('currencies')
        .insert(currencyRecords)
        .select();

      if (insertError) {
        console.error('[Currency API] Error inserting currencies:', insertError);
        return NextResponse.json(
          { error: 'Failed to create currency records' },
          { status: 500 }
        );
      }

      console.log(`[Currency API] Successfully created ${insertedCurrencies.length} currency records`);
      
      return NextResponse.json({
        success: true,
        message: 'Currency records created successfully',
        action: 'created',
        count: insertedCurrencies.length,
        rates: rates
      });

    } else {
      // Subsequent days: Update existing rates
      console.log('[Currency API] Updating existing currency rates...');
      
      const updatePromises = SUPPORTED_CURRENCIES.map(async (currency) => {
        const newRate = currency.code === 'USD' ? 1.0 : (rates[currency.code] || 1.0);
        
        const { error } = await supabase
          .from('currencies')
          .update({ 
            rate_to_usd: newRate,
            updated_at: new Date().toISOString()
          })
          .eq('code', currency.code);

        if (error) {
          console.error(`[Currency API] Error updating ${currency.code}:`, error);
          throw error;
        }

        return { code: currency.code, rate: newRate };
      });

      const updatedRates = await Promise.all(updatePromises);
      console.log(`[Currency API] Successfully updated ${updatedRates.length} currency rates`);

      return NextResponse.json({
        success: true,
        message: 'Currency rates updated successfully',
        action: 'updated',
        count: updatedRates.length,
        rates: rates,
        updatedRates
      });
    }

  } catch (error) {
    console.error('[Currency API] Unexpected error during update:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);