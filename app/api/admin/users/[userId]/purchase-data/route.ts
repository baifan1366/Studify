import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users/[userId]/purchase-data - Get user's purchase data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const supabase = await createAdminClient();

    // Get user profile first to get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's course orders
    const { data: orders } = await supabase
      .from('course_order')
      .select(`
        id,
        amount_cents,
        currency,
        status,
        created_at,
        course!inner(
          title
        )
      `)
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate total spent
    const totalSpentCents = (orders || [])
      .filter(order => order.status === 'completed')
      .reduce((total, order) => total + (order.amount_cents || 0), 0);

    // Format the data
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      amount_cents: order.amount_cents,
      currency: order.currency,
      status: order.status,
      created_at: order.created_at,
    }));

    return NextResponse.json({
      orders: formattedOrders,
      total_spent_cents: totalSpentCents,
      currency: orders?.[0]?.currency || 'USD',
    });

  } catch (error) {
    console.error('Admin user purchase data GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
