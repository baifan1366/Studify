import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

// Currency list with all required information and fallback rates
const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', country: 'United States', symbol: '$', fallbackRate: 1.0 },
  { code: 'MYR', name: 'Malaysian Ringgit', country: 'Malaysia', symbol: 'RM', fallbackRate: 4.70 },
  { code: 'EUR', name: 'Euro', country: 'European Union', symbol: '€', fallbackRate: 0.92 },
  { code: 'GBP', name: 'British Pound Sterling', country: 'United Kingdom', symbol: '£', fallbackRate: 0.79 },
  { code: 'SGD', name: 'Singapore Dollar', country: 'Singapore', symbol: 'S$', fallbackRate: 1.35 },
  { code: 'PHP', name: 'Philippine Peso', country: 'Philippines', symbol: '₱', fallbackRate: 56.50 },
  { code: 'THB', name: 'Thai Baht', country: 'Thailand', symbol: '฿', fallbackRate: 36.80 },
  { code: 'IDR', name: 'Indonesian Rupiah', country: 'Indonesia', symbol: 'Rp', fallbackRate: 15420 },
  { code: 'VND', name: 'Vietnamese Dong', country: 'Vietnam', symbol: '₫', fallbackRate: 24500 },
  { code: 'CNY', name: 'Chinese Yuan', country: 'China', symbol: '¥', fallbackRate: 7.25 },
  { code: 'JPY', name: 'Japanese Yen', country: 'Japan', symbol: '¥', fallbackRate: 149.50 },
  { code: 'KRW', name: 'South Korean Won', country: 'South Korea', symbol: '₩', fallbackRate: 1340 },
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
async function handler(req: NextRequest) {
  try {
    
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

    // Try to fetch exchange rates from exchangerate.host using live endpoint
    let rates: { [key: string]: number } = {};
    let usingFallbackRates = false;

    if (apiKey) {
      try {
        const symbols = SUPPORTED_CURRENCIES.map(c => c.code).join(',');
        const exchangeRateUrl = `http://api.exchangerate.host/live?access_key=${apiKey}&currencies=${symbols}&source=USD&format=1`;
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(exchangeRateUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.quotes) {
            // Convert live quotes to rates format (quotes like USDMYR, USDEUR to direct rates)
            Object.entries(data.quotes).forEach(([pair, rate]) => {
              // Extract currency code from pair (e.g., USDMYR -> MYR)
              const currency = pair.slice(3); // Remove 'USD' prefix
              rates[currency] = rate as number;
            });
            rates['USD'] = 1.0; // USD base rate
          } else {
            throw new Error(`API returned error: ${data.error?.info || 'Unknown error'}`);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.warn('[Currency API] Failed to fetch live rates, using fallback rates:', error);
        usingFallbackRates = true;
      }
    } else {
      console.warn('[Currency API] No API key provided, using fallback rates');
      usingFallbackRates = true;
    }

    // Use fallback rates if API failed or no API key
    if (usingFallbackRates) {
      SUPPORTED_CURRENCIES.forEach(currency => {
        rates[currency.code] = currency.fallbackRate;
      });
    }

    if (isFirstDay) {
      // First day: Create all currency records
      
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
      
      return NextResponse.json({
        success: true,
        message: 'Currency records created successfully',
        action: 'created',
        count: insertedCurrencies.length,
        rates: rates,
        usingFallbackRates
      });

    } else {
      // Subsequent days: Update existing rates
      
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

      return NextResponse.json({
        success: true,
        message: 'Currency rates updated successfully',
        action: 'updated',
        count: updatedRates.length,
        rates: rates,
        updatedRates,
        usingFallbackRates
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

// QStash signature verification for security
// In development, signature verification is optional for local testing
if (!process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.NODE_ENV === 'production') {
  console.warn('[Currency API] QSTASH_CURRENT_SIGNING_KEY is missing in production - signature verification disabled');
}

// Enhanced handler with better error handling for signature verification
async function enhancedHandler(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log('[Currency API] Request details:', {
      method: request.method,
      url: request.url,
      hasSigningKey: !!process.env.QSTASH_CURRENT_SIGNING_KEY,
      nodeEnv: process.env.NODE_ENV
    });

    return await handler(request);
  } catch (error) {
    console.error('[Currency API] Handler error:', error);
    return NextResponse.json(
      { 
        error: 'Handler error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// For local development or missing signing key, bypass signature verification
export const POST = (process.env.NODE_ENV === 'development' || !process.env.QSTASH_CURRENT_SIGNING_KEY)
  ? enhancedHandler
  : verifySignatureAppRouter(enhancedHandler);