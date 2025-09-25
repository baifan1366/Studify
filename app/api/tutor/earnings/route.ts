import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

interface EarningsRecord {
  id: string;
  source_type: 'course_sale' | 'tutoring_session' | 'commission';
  student_name?: string;
  course_name?: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'released' | 'on_hold';
  created_at: string;
  order_id?: string;
}

interface MonthlyEarnings {
  month: string;
  year: number;
  total_cents: number;
  course_sales_cents: number;
  tutoring_cents: number;
  commission_cents: number;
  status: 'current' | 'paid';
}

interface EarningsStats {
  total_earnings_cents: number;
  monthly_earnings_cents: number;
  pending_payout_cents: number;
  students_count: number;
  growth_percentage: number;
  courses_sold: number;
}

interface EarningsData {
  stats: EarningsStats;
  monthly_breakdown: MonthlyEarnings[];
  recent_transactions: EarningsRecord[];
}

// GET /api/tutor/earnings - 获取导师收入数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const url = new URL(request.url);
    
    // 查询参数
    const months = parseInt(url.searchParams.get('months') || '12'); // 默认12个月
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tutorId = user.profile?.id || user.id;

    // 获取导师的课程ID列表
    const { data: tutorCourses, error: coursesError } = await client
      .from('course')
      .select('id, title')
      .eq('tutor_id', tutorId)
      .eq('is_deleted', false);

    if (coursesError) {
      console.error('Error fetching tutor courses:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch tutor courses' }, { status: 500 });
    }

    const courseIds = tutorCourses?.map(c => c.id) || [];
    const courseTitleMap = new Map(tutorCourses?.map(c => [c.id, c.title]) || []);

    // 如果导师没有课程，返回空数据
    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            total_earnings_cents: 0,
            monthly_earnings_cents: 0,
            pending_payout_cents: 0,
            students_count: 0,
            growth_percentage: 0,
            courses_sold: 0
          },
          monthly_breakdown: [],
          recent_transactions: []
        }
      });
    }

    // 获取课程产品ID
    const { data: courseProducts, error: productsError } = await client
      .from('course_product')
      .select('id, ref_id, title, price_cents')
      .eq('kind', 'course')
      .in('ref_id', courseIds)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (productsError) {
      console.error('Error fetching course products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch course products' }, { status: 500 });
    }

    const productIds = courseProducts?.map(p => p.id) || [];
    const productMap = new Map(courseProducts?.map(p => [p.id, p]) || []);

    // 获取销售数据 - 从订单项中获取
    const { data: salesData, error: salesError } = await client
      .from('course_order_item')
      .select(`
        id,
        public_id,
        quantity,
        unit_price_cents,
        subtotal_cents,
        created_at,
        course_order (
          id,
          public_id,
          buyer_id,
          status,
          currency,
          created_at,
          profiles (
            id,
            display_name,
            full_name
          )
        ),
        course_product (
          id,
          ref_id,
          title,
          price_cents
        )
      `)
      .in('product_id', productIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
    }

    // 处理收入记录
    const earnings: EarningsRecord[] = [];
    const monthlyData = new Map<string, MonthlyEarnings>();
    let totalEarnings = 0;
    let pendingPayout = 0;
    const uniqueStudents = new Set<number>();
    let coursesSold = 0;

    salesData?.forEach((item: any) => {
      const order = item.course_order;
      const product = item.course_product;
      const buyer = order?.profiles;
      
      if (!order || !product) return;

      const studentName = buyer?.display_name || buyer?.full_name || 'Unknown Student';
      const courseName = courseTitleMap.get(product.ref_id) || product.title;
      
      // 计算导师分成（假设导师获得70%）
      const tutorShare = Math.floor(item.subtotal_cents * 0.7);
      
      const earningRecord: EarningsRecord = {
        id: item.public_id,
        source_type: 'course_sale',
        student_name: studentName,
        course_name: courseName,
        amount_cents: tutorShare,
        currency: order.currency,
        status: order.status === 'paid' ? 'released' : 'pending',
        created_at: item.created_at,
        order_id: order.public_id
      };

      earnings.push(earningRecord);

      // 统计数据
      if (order.status === 'paid') {
        totalEarnings += tutorShare;
        uniqueStudents.add(order.buyer_id);
        coursesSold += item.quantity;
      } else if (order.status === 'pending') {
        pendingPayout += tutorShare;
      }

      // 月度统计
      const date = new Date(item.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          year: date.getFullYear(),
          total_cents: 0,
          course_sales_cents: 0,
          tutoring_cents: 0,
          commission_cents: 0,
          status: date.getMonth() === new Date().getMonth() && 
                  date.getFullYear() === new Date().getFullYear() ? 'current' : 'paid'
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      if (order.status === 'paid') {
        monthData.total_cents += tutorShare;
        monthData.course_sales_cents += tutorShare;
      }
    });

    // 计算当月收入
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthlyEarnings = monthlyData.get(currentMonthKey)?.total_cents || 0;

    // 计算增长率（与上月比较）
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthEarnings = monthlyData.get(lastMonthKey)?.total_cents || 0;
    const growthPercentage = lastMonthEarnings > 0 
      ? Math.round(((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : 0;

    // 构建统计数据
    const stats: EarningsStats = {
      total_earnings_cents: totalEarnings,
      monthly_earnings_cents: monthlyEarnings,
      pending_payout_cents: pendingPayout,
      students_count: uniqueStudents.size,
      growth_percentage: growthPercentage,
      courses_sold: coursesSold
    };

    // 转换月度数据为数组并排序
    const monthlyBreakdown = Array.from(monthlyData.values())
      .sort((a, b) => {
        const dateA = new Date(a.year, new Date(`${a.month} 1, ${a.year}`).getMonth());
        const dateB = new Date(b.year, new Date(`${b.month} 1, ${b.year}`).getMonth());
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, months);

    // 获取最近交易（分页）
    const recentTransactions = earnings
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    const response: EarningsData & { pagination: any } = {
      stats,
      monthly_breakdown: monthlyBreakdown,
      recent_transactions: recentTransactions,
      pagination: {
        page,
        limit,
        total: earnings.length,
        totalPages: Math.ceil(earnings.length / limit),
        hasNext: offset + limit < earnings.length,
        hasPrev: page > 1
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in GET /api/tutor/earnings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tutor/earnings/payout - 请求提现（可选功能）
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const body = await request.json();
    
    const { amount_cents, payment_method = 'bank_transfer' } = body;
    
    if (!amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    const tutorId = user.profile?.id || user.id;

    // 这里可以添加提现逻辑
    // 1. 检查导师的可提现余额
    // 2. 创建提现请求记录
    // 3. 更新相关订单状态等

    // 示例：创建提现请求记录（需要相应的数据表）
    /*
    const { data: payoutRequest, error: payoutError } = await client
      .from('tutor_payout_request')
      .insert({
        tutor_id: tutorId,
        amount_cents,
        payment_method,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();
    */

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      data: {
        amount_cents,
        payment_method,
        status: 'pending',
        estimated_processing_days: 3
      }
    });

  } catch (error) {
    console.error('Error in POST /api/tutor/earnings/payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
