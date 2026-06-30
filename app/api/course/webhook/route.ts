import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { handleStudentEnrollmentFlow } from "@/lib/auto-creation/student-enrollment-flow";

// Platform commission rate (10%)
const PLATFORM_COMMISSION_RATE = 0.10;

// Function to handle tutor earnings allocation
async function handleTutorEarnings(supabase: any, course: any, order: any, session: any) {
  try {
    console.log(`[Earnings] Processing earnings for course: ${course.title}, order: ${order.public_id}`);
    
    // Get course owner (tutor)
    const { data: tutor, error: tutorError } = await supabase
      .from('profiles')
      .select('id, public_id, full_name, display_name')
      .eq('id', course.owner_id)
      .single();

    if (tutorError || !tutor) {
      console.error('[Earnings] Failed to find course owner/tutor:', tutorError);
      return;
    }

    // Stripe retries webhook events. An order may create exactly one earning.
    const { data: existingEarning } = await supabase
      .from('tutor_earnings')
      .select('id')
      .eq('source_type', 'course_sale')
      .eq('source_id', order.id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingEarning) return;

    const grossAmount = order.total_cents;
    const platformFee = Math.floor(grossAmount * PLATFORM_COMMISSION_RATE);
    const tutorAmount = grossAmount - platformFee;
    const currency = order.currency || 'MYR';

    console.log(`[Earnings] Gross: ${grossAmount}, Platform Fee: ${platformFee}, Tutor: ${tutorAmount}`);

    // Create tutor earnings record
    const { data: earningsRecord, error: earningsError } = await supabase
      .from('tutor_earnings')
      .insert({
        tutor_id: tutor.id,
        source_type: 'course_sale',
        source_id: order.id,
        gross_amount_cents: grossAmount,
        platform_fee_cents: platformFee,
        tutor_amount_cents: tutorAmount,
        currency: currency,
        status: 'pending', // Will be released after 7 days
        release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        payment_intent_id: session.payment_intent,
        metadata: {
          course_id: course.id,
          course_title: course.title,
          student_id: order.buyer_id,
          order_public_id: order.public_id,
        }
      })
      .select()
      .single();

    if (earningsError) {
      console.error('[Earnings] Failed to create earnings record:', earningsError);
      return;
    }

    console.log(`[Earnings] Created earnings record: ${earningsRecord.public_id}`);

    // Transfers are deliberately deferred to the release worker after the
    // refund/chargeback holding period. Never move money inside a webhook.
    console.log('[Earnings] Tutor earnings processing completed successfully');

  } catch (error) {
    console.error('[Earnings] Error processing tutor earnings:', error);
  }
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  
  try {
    const body = await request.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      console.error('[Webhook] Missing Stripe signature header');
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('[Webhook] Missing webhook secret configuration');
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        if (!session.metadata) {
          console.error('[Webhook] Missing session metadata');
          return NextResponse.json({ error: "Missing session metadata" }, { status: 400 });
        }
        
        const { orderId, courseId, userId } = session.metadata;

        // Get order details
        const { data: order, error: orderError } = await supabase
          .from("course_order")
          .select("*, course_order_item(*, course_product(*))")
          .eq("public_id", orderId)
          .single();

        if (orderError || !order) {
          console.error("Order not found:", orderId);
          return NextResponse.json(
            { error: "Order not found" },
            { status: 404 }
          );
        }

        // Update payment status
        await supabase
          .from("course_payment")
          .update({ status: "succeeded" })
          .eq("provider_ref", session.id);

        // Update order status
        await supabase
          .from("course_order")
          .update({ status: "paid" })
          .eq("public_id", orderId);

        // Get course and user details
        const { data: course } = await supabase
          .from("course")
          .select("*")
          .eq("public_id", courseId)
          .single();

        const { data: user } = await supabase
          .from("profiles")
          .select("*")
          .eq("public_id", userId)
          .single();

        if (course && user) {
          const { data: existingEnrollment } = await supabase
            .from("course_enrollment")
            .select("id")
            .eq("course_id", course.id)
            .eq("user_id", user.id)
            .maybeSingle();

          // Enroll user in course
          const { error: enrollmentError } = existingEnrollment
            ? { error: null }
            : await supabase.from("course_enrollment").insert({
                course_id: course.id,
                user_id: user.id,
                role: "student",
                status: "active",
              });

          if (enrollmentError) {
            console.error("[Webhook] Failed to enroll user:", enrollmentError);
          } else if (!existingEnrollment) {
            console.log("[Webhook] User enrolled successfully, starting auto-creation flow");
            
            // After enrollment, handle complete auto-creation flow
            const autoCreationResult = await handleStudentEnrollmentFlow(supabase, course, user.id);
            
            if (!autoCreationResult.success) {
              console.error('[Webhook] Student enrollment auto-creation flow failed:', autoCreationResult.error);
              // Log error but don't fail the entire webhook - enrollment was successful
            } else {
              console.log('[Webhook] Student enrollment auto-creation flow completed successfully');
              
              // Log detailed results for debugging
              if (autoCreationResult.classroomResult) {
                const cr = autoCreationResult.classroomResult;
                console.log(`[Webhook] Classroom result - Created: ${cr.created}, Joined: ${cr.joined}, Name: ${cr.name}`);
              }
              
              if (autoCreationResult.communityResult) {
                const ccr = autoCreationResult.communityResult;
                console.log(`[Webhook] Community result - Created: ${ccr.created}, Joined: ${ccr.joined}, Name: ${ccr.name}`);
              }
            }
          }

          if (!existingEnrollment && !enrollmentError) {
            await supabase.rpc("increment_course_students", {
              course_id: course.id,
            });
          }

          // 🚀 NEW: Handle tutor earnings allocation
          console.log("[Webhook] Processing tutor earnings for course sale");
          await handleTutorEarnings(supabase, course, order, session);
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;

        // Update payment status
        await supabase
          .from("course_payment")
          .update({ status: "failed" })
          .eq("provider_ref", paymentIntent.id);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
