import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.user;
    
    const { courseId, successUrl, cancelUrl } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get course details - handle both UUID and slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq('slug', courseId)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get user profile ID (already available from server guard)
    const profileId = user.profile?.id;
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }

    // Check if user already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', course.id)
      .eq('user_id', profileId)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        enrolled: true,
        alreadyEnrolled: true,
        courseSlug: course.slug,
        message: 'You are already enrolled in this course'
      });
    }


    // Create course order
    const { data: order, error: orderError } = await supabase
      .from('course_order')
      .insert({
        buyer_id: profileId,
        total_cents: course.price_cents || 0,
        currency: course.currency || 'MYR',
        status: 'pending'
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create course product if not exists
    let { data: product } = await supabase
      .from('course_product')
      .select('*')
      .eq('kind', 'course')
      .eq('ref_id', course.id)
      .eq('is_active', true)
      .single();

    if (!product) {
      const { data: newProduct, error: productError } = await supabase
        .from('course_product')
        .insert({
          kind: 'course',
          ref_id: course.id,
          title: course.title,
          price_cents: course.price_cents || 0,
          currency: course.currency || 'MYR'
        })
        .select()
        .single();

      if (productError) {
        return NextResponse.json(
          { error: 'Failed to create product' },
          { status: 500 }
        );
      }
      product = newProduct;
    }

    // Create order item
    const { error: orderItemError } = await supabase
      .from('course_order_item')
      .insert({
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents
      });

    if (orderItemError) {
      return NextResponse.json(
        { error: 'Failed to create order item' },
        { status: 500 }
      );
    }

    // Handle free courses
    if ((course.price_cents || 0) === 0 || course.is_free) {
      // Directly enroll user for free courses (profileId already obtained above)
      const { error: enrollmentError } = await supabase
        .from('course_enrollment')
        .insert({
          course_id: course.id,
          user_id: profileId,
          role: 'student',
          status: 'active'
        });

      if (enrollmentError) {
        return NextResponse.json(
          { error: 'Failed to enroll in course' },
          { status: 500 }
        );
      }

      // Update order status
      await supabase
        .from('course_order')
        .update({ status: 'paid' })
        .eq('id', order.id);

      return NextResponse.json({
        success: true,
        enrolled: true,
        orderId: order.public_id
      });
    }

    // Create Stripe checkout session for paid courses
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: course.currency?.toLowerCase() || 'myr',
            product_data: {
              name: course.title,
              description: course.description || '',
              images: course.thumbnail_url ? [course.thumbnail_url] : [],
            },
            unit_amount: course.price_cents || 0,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/course/${course.slug}?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/course/${course.slug}`,
      metadata: {
        orderId: order.public_id,
        courseId: course.public_id,
        userId: user.profile?.public_id || user.id,
      },
    });

    // Store payment record
    await supabase
      .from('course_payment')
      .insert({
        order_id: order.id,
        provider: 'stripe',
        provider_ref: session.id,
        amount_cents: course.price_cents || 0,
        status: 'pending'
      });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      orderId: order.public_id
    });

  } catch (error) {
    console.error('Course order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
