import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

// Scheduled task to release earnings that are older than 7 days
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    
    // Call the database function to release eligible earnings
    const { data, error } = await supabase.rpc('release_eligible_earnings');
    
    if (error) {
      console.error('Error releasing earnings:', error);
      return NextResponse.json(
        { error: 'Failed to release earnings' },
        { status: 500 }
      );
    }

    const releasedCount = data || 0;
    console.log(`[Earnings Release] Released ${releasedCount} earnings records`);

    // Optional: Create transfers for tutors with Stripe Connect accounts
    if (releasedCount > 0) {
      await processStripeTransfers(supabase);
    }

    return NextResponse.json({
      success: true,
      releasedCount,
      message: `Released ${releasedCount} earnings records`
    });

  } catch (error) {
    console.error('Earnings release error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Process Stripe transfers for newly released earnings
async function processStripeTransfers(supabase: any) {
  try {
    // Get newly released earnings that don't have transfers yet
    const { data: pendingTransfers, error } = await supabase
      .from('tutor_earnings')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email
        ),
        tutor_stripe_accounts (
          stripe_account_id,
          charges_enabled,
          payouts_enabled
        )
      `)
      .eq('status', 'released')
      .is('stripe_transfer_id', null)
      .eq('is_deleted', false);

    if (error || !pendingTransfers?.length) {
      console.log('[Stripe Transfers] No pending transfers found');
      return;
    }

    const { stripe } = await import('@/lib/stripe');
    let transfersCreated = 0;

    for (const earning of pendingTransfers) {
      try {
        const stripeAccount = earning.tutor_stripe_accounts;
        
        if (!stripeAccount || !stripeAccount.charges_enabled || !stripeAccount.payouts_enabled) {
          console.log(`[Stripe Transfers] Skipping transfer for tutor ${earning.tutor_id} - account not ready`);
          continue;
        }

        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: earning.tutor_amount_cents,
          currency: earning.currency.toLowerCase(),
          destination: stripeAccount.stripe_account_id,
          transfer_group: `earnings_release_${earning.id}`,
          metadata: {
            tutor_id: earning.tutor_id.toString(),
            earnings_id: earning.id.toString(),
            release_type: 'scheduled',
          },
        });

        // Update earnings record with transfer ID
        await supabase
          .from('tutor_earnings')
          .update({
            stripe_transfer_id: transfer.id,
            metadata: {
              ...earning.metadata,
              stripe_transfer_id: transfer.id,
              transfer_created_at: new Date().toISOString(),
            }
          })
          .eq('id', earning.id);

        transfersCreated++;
        console.log(`[Stripe Transfers] Created transfer ${transfer.id} for tutor ${earning.tutor_id}`);

      } catch (transferError) {
        console.error(`[Stripe Transfers] Failed to create transfer for earning ${earning.id}:`, transferError);
        
        const errorMessage = transferError instanceof Error ? transferError.message : 'Unknown transfer error';
        
        // Mark earning as failed transfer
        await supabase
          .from('tutor_earnings')
          .update({
            status: 'on_hold',
            metadata: {
              ...earning.metadata,
              transfer_error: errorMessage,
              transfer_failed_at: new Date().toISOString(),
            }
          })
          .eq('id', earning.id);
      }
    }

    console.log(`[Stripe Transfers] Created ${transfersCreated} transfers out of ${pendingTransfers.length} eligible earnings`);

  } catch (error) {
    console.error('[Stripe Transfers] Error processing transfers:', error);
  }
}

// Manual trigger endpoint (for testing)
export async function GET(request: NextRequest) {
  try {
    // For development/testing purposes
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Not available in production' },
        { status: 403 }
      );
    }

    const supabase = await createAdminClient();
    
    const { data, error } = await supabase.rpc('release_eligible_earnings');
    
    if (error) {
      console.error('Error releasing earnings:', error);
      return NextResponse.json(
        { error: 'Failed to release earnings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      releasedCount: data || 0,
      message: `Released ${data || 0} earnings records (development mode)`
    });

  } catch (error) {
    console.error('Manual earnings release error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
