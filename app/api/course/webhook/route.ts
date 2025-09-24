import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { handleStudentEnrollmentFlow } from "@/lib/auto-creation/student-enrollment-flow";

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
          
          // Enroll user in course
          const { error: enrollmentError } = await supabase
            .from("course_enrollment")
            .insert({
              course_id: course.id,
              user_id: user.id,
              role: "student",
              status: "active",
            });

          if (enrollmentError) {
            console.error("[Webhook] Failed to enroll user:", enrollmentError);
          } else {
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

          // Update course student count
          await supabase.rpc("increment_course_students", {
            course_id: course.id,
          });
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
