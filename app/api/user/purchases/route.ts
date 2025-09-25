import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

interface PurchaseRecord {
  id: string;
  item_name: string;
  purchase_type: 'course' | 'plugin' | 'resource';
  amount_cents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  order_id: string;
  product_id: string;
}

interface PurchaseStats {
  total_spent_cents: number;
  courses_owned: number;
  active_orders: number;
  last_purchase: {
    date: string;
    item_name: string;
  } | null;
}

interface PurchaseData {
  stats: PurchaseStats;
  purchases: PurchaseRecord[];
}

// GET /api/user/purchases - 获取用户购买记录
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const url = new URL(request.url);
    
    // 分页参数
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // 筛选参数
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    const userId = user.profile?.id || user.id;

    // 构建查询 - 获取用户的订单和订单项
    let ordersQuery = client
      .from('course_order')
      .select(`
        id,
        public_id,
        status,
        total_cents,
        currency,
        created_at,
        course_order_item (
          id,
          public_id,
          quantity,
          unit_price_cents,
          subtotal_cents,
          course_product (
            id,
            public_id,
            kind,
            title,
            price_cents,
            currency
          )
        )
      `)
      .eq('buyer_id', userId)
      .eq('is_deleted', false);

    // 应用筛选条件
    if (status) {
      ordersQuery = ordersQuery.eq('status', status);
    }
    
    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate);
    }
    
    if (endDate) {
      ordersQuery = ordersQuery.lte('created_at', endDate);
    }

    // 获取总数（用于分页）
    const { count: totalCount } = await client
      .from('course_order')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('is_deleted', false);

    // 获取分页数据
    const { data: ordersData, error: ordersError } = await ordersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('Error fetching purchase orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch purchase data' }, { status: 500 });
    }

    // 处理购买记录数据
    const purchases: PurchaseRecord[] = [];
    
    ordersData?.forEach(order => {
      order.course_order_item?.forEach((item: any) => {
        const product = item.course_product;
        if (product && (!type || product.kind === type)) {
          purchases.push({
            id: item.public_id,
            item_name: product.title,
            purchase_type: product.kind as 'course' | 'plugin' | 'resource',
            amount_cents: item.subtotal_cents,
            currency: order.currency,
            status: order.status as 'pending' | 'paid' | 'failed' | 'refunded',
            created_at: order.created_at,
            order_id: order.public_id,
            product_id: product.public_id
          });
        }
      });
    });

    // 计算统计数据
    const totalSpent = purchases
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0);

    const coursesOwned = purchases
      .filter(p => p.purchase_type === 'course' && p.status === 'paid')
      .length;

    const activeOrders = purchases
      .filter(p => p.status === 'pending')
      .length;

    const lastPurchase = purchases
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const stats: PurchaseStats = {
      total_spent_cents: totalSpent,
      courses_owned: coursesOwned,
      active_orders: activeOrders,
      last_purchase: lastPurchase ? {
        date: lastPurchase.created_at,
        item_name: lastPurchase.item_name
      } : null
    };

    const response: PurchaseData & { pagination: any } = {
      stats,
      purchases,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: offset + limit < (totalCount || 0),
        hasPrev: page > 1
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in GET /api/user/purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/purchases - 创建新的购买订单（可选功能）
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const body = await request.json();
    
    const { product_ids, currency = 'MYR' } = body;
    
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 });
    }

    const userId = user.profile?.id || user.id;

    // 获取产品信息
    const { data: products, error: productsError } = await client
      .from('course_product')
      .select('*')
      .in('public_id', product_ids)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Invalid or inactive products' }, { status: 400 });
    }

    // 计算总金额
    const totalCents = products.reduce((sum, product) => sum + product.price_cents, 0);

    // 创建订单
    const { data: order, error: orderError } = await client
      .from('course_order')
      .insert({
        buyer_id: userId,
        status: 'pending',
        total_cents: totalCents,
        currency,
        meta: { created_via: 'api' }
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // 创建订单项
    const orderItems = products.map(product => ({
      order_id: order.id,
      product_id: product.id,
      quantity: 1,
      unit_price_cents: product.price_cents,
      subtotal_cents: product.price_cents
    }));

    const { error: itemsError } = await client
      .from('course_order_item')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // 回滚订单
      await client
        .from('course_order')
        .update({ is_deleted: true })
        .eq('id', order.id);
      
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.public_id,
        total_cents: totalCents,
        currency,
        status: 'pending',
        products: products.map(p => ({
          id: p.public_id,
          title: p.title,
          price_cents: p.price_cents
        }))
      }
    });

  } catch (error) {
    console.error('Error in POST /api/user/purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
