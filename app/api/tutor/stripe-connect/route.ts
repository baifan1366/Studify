import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createAdminClient();
    const { payload, user } = authResult;
    const tutorId = user.profile?.id;
    
    if (!tutorId) {
      return NextResponse.json(
        { error: 'Tutor profile not found' },
        { status: 400 }
      );
    }

    // Get user profile data
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('public_id, country, email')
      .eq('id', tutorId)
      .single();

    const { action, return_url, refresh_url } = await request.json();

    // Check if tutor already has a Stripe Connect account
    const { data: existingAccount } = await supabase
      .from('tutor_stripe_accounts')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('is_deleted', false)
      .single();

    switch (action) {
      case 'create_account': {
        if (existingAccount) {
          return NextResponse.json(
            { error: 'Stripe Connect account already exists' },
            { status: 400 }
          );
        }

        // Create Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: userProfile?.country || 'MY',
          email: userProfile?.email || payload.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            tutor_id: tutorId.toString(),
            tutor_public_id: userProfile?.public_id || '',
          },
        });

        // Store account in database
        const { error: dbError } = await supabase
          .from('tutor_stripe_accounts')
          .insert({
            tutor_id: tutorId,
            stripe_account_id: account.id,
            account_status: 'pending',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            country: account.country || 'MY',
            currency: account.default_currency || 'myr',
            account_type: account.type,
            capabilities: account.capabilities,
          });

        if (dbError) {
          console.error('Failed to store Stripe account:', dbError);
          return NextResponse.json(
            { error: 'Failed to store account details' },
            { status: 500 }
          );
        }

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: refresh_url || `${process.env.NEXT_PUBLIC_SITE_URL}/tutor/earnings/setup?refresh=true`,
          return_url: return_url || `${process.env.NEXT_PUBLIC_SITE_URL}/tutor/earnings?setup=complete`,
          type: 'account_onboarding',
        });

        // Update onboarding URL
        await supabase
          .from('tutor_stripe_accounts')
          .update({ onboarding_url: accountLink.url })
          .eq('stripe_account_id', account.id);

        return NextResponse.json({
          success: true,
          account_id: account.id,
          onboarding_url: accountLink.url,
        });
      }

      case 'get_onboarding_link': {
        if (!existingAccount) {
          return NextResponse.json(
            { error: 'No Stripe Connect account found' },
            { status: 404 }
          );
        }

        // Create fresh account link
        const accountLink = await stripe.accountLinks.create({
          account: existingAccount.stripe_account_id,
          refresh_url: refresh_url || `${process.env.NEXT_PUBLIC_SITE_URL}/tutor/earnings/setup?refresh=true`,
          return_url: return_url || `${process.env.NEXT_PUBLIC_SITE_URL}/tutor/earnings?setup=complete`,
          type: 'account_onboarding',
        });

        return NextResponse.json({
          success: true,
          onboarding_url: accountLink.url,
        });
      }

      case 'get_dashboard_link': {
        if (!existingAccount) {
          return NextResponse.json(
            { error: 'No Stripe Connect account found' },
            { status: 404 }
          );
        }

        // Create dashboard login link
        const loginLink = await stripe.accounts.createLoginLink(
          existingAccount.stripe_account_id
        );

        return NextResponse.json({
          success: true,
          dashboard_url: loginLink.url,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to process Stripe Connect request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createAdminClient();
    const { payload, user } = authResult;
    const tutorId = user.profile?.id;
    
    if (!tutorId) {
      return NextResponse.json(
        { error: 'Tutor profile not found' },
        { status: 400 }
      );
    }

    // Get Stripe Connect account details
    const { data: stripeAccount } = await supabase
      .from('tutor_stripe_accounts')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('is_deleted', false)
      .single();

    if (!stripeAccount) {
      return NextResponse.json({
        success: true,
        account_exists: false,
        account: null,
      });
    }

    // Fetch latest account info from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);

    // Update our database with latest info
    await supabase
      .from('tutor_stripe_accounts')
      .update({
        account_status: account.charges_enabled && account.payouts_enabled ? 'enabled' : 'pending',
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities,
        onboarding_completed: account.details_submitted && account.charges_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', stripeAccount.stripe_account_id);

    return NextResponse.json({
      success: true,
      account_exists: true,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        capabilities: account.capabilities,
        country: account.country,
        default_currency: account.default_currency,
      },
    });
  } catch (error) {
    console.error('Get Stripe Connect account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account details' },
      { status: 500 }
    );
  }
}
