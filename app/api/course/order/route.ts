import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { handleStudentEnrollmentFlow } from '@/lib/auto-creation/student-enrollment-flow';

export async function POST(request: NextRequest) {
  let reservedRedemptionId: number | null = null;
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.user;
    
    const { courseId, successUrl, cancelUrl, usePoints = false } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get course details - handle both public_id and slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq(isUUID ? 'public_id' : 'slug', courseId)
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


    let checkoutPriceCents = course.price_cents || 0;
    let pointsRedemption: any = null;

    if (usePoints && checkoutPriceCents > 0) {
      const { data: redemption, error: redemptionError } = await supabase.rpc(
        'reserve_course_points_discount',
        { p_course_id: course.id }
      );
      if (redemptionError || redemption?.error) {
        return NextResponse.json(
          { error: redemption?.error || redemptionError?.message || 'Could not apply points' },
          { status: redemption?.error === 'Insufficient points' ? 409 : 400 }
        );
      }
      pointsRedemption = redemption;
      reservedRedemptionId = redemption.redemption_id;
      checkoutPriceCents = redemption.cash_due_cents;
    }

    // Create course order
    const { data: order, error: orderError } = await supabase
      .from('course_order')
      .insert({
        buyer_id: profileId,
        total_cents: checkoutPriceCents,
        currency: course.currency || 'MYR',
        status: 'pending',
        meta: pointsRedemption ? {
          points_redemption_id: pointsRedemption.redemption_id,
          points_spent: pointsRedemption.points_spent,
          discount_cents: pointsRedemption.discount_cents,
          original_price_cents: pointsRedemption.original_price_cents,
        } : {}
      })
      .select()
      .single();

    if (orderError || !order) {
      if (pointsRedemption) {
        await supabase.rpc('refund_reserved_course_points', {
          p_redemption_id: pointsRedemption.redemption_id,
        });
      }
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: `Failed to create order: ${orderError?.message || 'Unknown error'}` },
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
        console.error('Product creation error:', productError);
        if (pointsRedemption) await supabase.rpc('refund_reserved_course_points', {
          p_redemption_id: pointsRedemption.redemption_id,
        });
        return NextResponse.json(
          { error: `Failed to create product: ${productError?.message || 'Unknown error'}` },
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
        unit_price_cents: checkoutPriceCents,
        subtotal_cents: checkoutPriceCents
      });

    if (orderItemError) {
      console.error('Order item creation error:', orderItemError);
      if (pointsRedemption) await supabase.rpc('refund_reserved_course_points', {
        p_redemption_id: pointsRedemption.redemption_id,
      });
      return NextResponse.json(
        { error: `Failed to create order item: ${orderItemError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Handle free courses
    if (checkoutPriceCents === 0 || course.is_free) {
      // Directly enroll user for free courses (profileId already obtained above)
      const { data: existingAfterRedemption } = await supabase
        .from('course_enrollment')
        .select('id')
        .eq('course_id', course.id)
        .eq('user_id', profileId)
        .maybeSingle();
      const { error: enrollmentError } = existingAfterRedemption
        ? { error: null }
        : await supabase.from('course_enrollment').insert({
            course_id: course.id,
            user_id: profileId,
            role: 'student',
            status: 'active'
          });

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        return NextResponse.json(
          { error: `Failed to enroll in course: ${enrollmentError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Update order status
      await supabase
        .from('course_order')
        .update({ status: 'paid' })
        .eq('id', order.id);
      if (pointsRedemption) {
        await supabase.from('point_redemption').update({
          order_id: order.id,
          status: 'completed',
          completion_date: new Date().toISOString(),
        }).eq('id', pointsRedemption.redemption_id);
      }

      // After enrollment, handle complete auto-creation flow
      console.log("[Order] User enrolled successfully, starting auto-creation flow");
      
      const autoCreationResult = await handleStudentEnrollmentFlow(supabase, course, profileId);
      
      if (!autoCreationResult.success) {
        console.error('[Order] Student enrollment auto-creation flow failed:', autoCreationResult.error);
        // Log error but don't fail the entire enrollment - course enrollment was successful
      } else {
        console.log('[Order] Student enrollment auto-creation flow completed successfully');
        
        // Log detailed results for debugging
        if (autoCreationResult.classroomResult) {
          const cr = autoCreationResult.classroomResult;
          console.log(`[Order] Classroom result - Created: ${cr.created}, Joined: ${cr.joined}, Name: ${cr.name}`);
        }
        
        if (autoCreationResult.communityResult) {
          const ccr = autoCreationResult.communityResult;
          console.log(`[Order] Community result - Created: ${ccr.created}, Joined: ${ccr.joined}, Name: ${ccr.name}`);
        }
      } 

      return NextResponse.json({
        success: true,
        enrolled: true,
        courseSlug: course.slug,
        orderId: order.public_id
      });
    }

    // Get the base URL for redirects - prioritize environment variable, fallback to request headers
    const getBaseUrl = () => {
      
      // First try environment variable (should be set correctly in deployment)
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        // Remove trailing slash if present to avoid double slashes
        const cleanUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
        return cleanUrl;
      }
      
      // Fallback to request headers for deployed environments
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const fallbackUrl = `${protocol}://${host}`;
      return fallbackUrl;
    };

    const baseUrl = getBaseUrl();
    const finalSuccessUrl = `${baseUrl}/course/${course.slug}?success=true`;
    const finalCancelUrl = `${baseUrl}/course/${course.slug}`;

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
            unit_amount: checkoutPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        metadata: {
          orderId: order.public_id,
          pointsRedemptionId: pointsRedemption?.redemption_id?.toString() || '',
        },
      },
      success_url: successUrl ? successUrl.replace('{courseSlug}', course.slug) : finalSuccessUrl,
      cancel_url: cancelUrl ? cancelUrl.replace('{courseSlug}', course.slug) : finalCancelUrl,
      metadata: {
        orderId: order.public_id,
        courseId: course.public_id,
        userId: user.profile?.public_id || user.id,
        pointsRedemptionId: pointsRedemption?.redemption_id?.toString() || '',
      },
    });

    // Store payment record
    await supabase
      .from('course_payment')
      .insert({
        order_id: order.id,
        provider: 'stripe',
        provider_ref: session.id,
        amount_cents: checkoutPriceCents,
        status: 'pending'
      });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      orderId: order.public_id,
      pointsApplied: pointsRedemption ? {
        pointsSpent: pointsRedemption.points_spent,
        discountCents: pointsRedemption.discount_cents,
      } : undefined
    });

  } catch (error) {
    console.error('Course order error:', error);
    if (reservedRedemptionId) {
      try {
        const refundClient = await createClient();
        await refundClient.rpc('refund_reserved_course_points', {
          p_redemption_id: reservedRedemptionId,
        });
      } catch (refundError) {
        console.error('Failed to refund reserved course points:', refundError);
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
