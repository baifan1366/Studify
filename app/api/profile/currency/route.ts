import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET /api/profile/currency - 获取用户货币设置
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    
    const userId = user.profile?.id || user.id;

    // 获取用户的货币设置
    const { data: profile, error } = await client
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching user currency:', error);
      return NextResponse.json({ error: 'Failed to fetch currency setting' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        currency: profile?.currency || 'MYR'
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/currency:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/profile/currency - 更新用户货币设置
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const body = await request.json();
    
    const { currency } = body;
    
    // 验证货币代码
    const supportedCurrencies = ['MYR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'CNY', 'THB', 'IDR', 'VND'];
    if (!currency || !supportedCurrencies.includes(currency)) {
      return NextResponse.json({ 
        error: 'Invalid currency code. Supported currencies: ' + supportedCurrencies.join(', ')
      }, { status: 400 });
    }

    const userId = user.profile?.id || user.id;

    // 更新用户的货币设置
    const { data: updatedProfile, error } = await client
      .from('profiles')
      .update({ 
        currency,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('is_deleted', false)
      .select('currency')
      .single();

    if (error) {
      console.error('Error updating user currency:', error);
      return NextResponse.json({ error: 'Failed to update currency setting' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        currency: updatedProfile.currency
      },
      message: 'Currency setting updated successfully'
    });

  } catch (error) {
    console.error('Error in PATCH /api/profile/currency:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
