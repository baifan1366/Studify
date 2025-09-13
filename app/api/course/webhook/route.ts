import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get("stripe-signature")!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { orderId, courseId, userId } = session.metadata!;

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
            console.error("Failed to enroll user:", enrollmentError);
          } else {
            let groupPublicId = course.community_group_public_id;

            if (!groupPublicId) {
              // 1. create a new private group
              const { data: newGroup, error: groupError } = await supabase
                .from("community_group")
                .insert({
                  name: `${course.title} Study Group`,
                  description: `Course Study Group - ${course.title}`,
                  slug: `${course.slug}-group`,
                  visibility: "private",
                  owner_id: course.owner_id,
                })
                .select()
                .single();

              if (groupError) {
                console.error("Failed to create community group:", groupError);
              } else {
                groupPublicId = newGroup.public_id;
                // 更新 course 绑定 group
                await supabase
                  .from("course")
                  .update({ community_group_public_id: groupPublicId })
                  .eq("id", course.id);
              }
            }
            if (groupPublicId) {
              // 2. join the group
              const { data: groupRow, error: groupLookupError } = await supabase
                .from("community_group")
                .select("id")
                .eq("public_id", groupPublicId)
                .single();

              if (groupLookupError || !groupRow) {
                console.error("Failed to lookup group:", groupLookupError);
              } else {
                const groupId = groupRow.id;

                const { data: existingMember } = await supabase
                  .from("community_group_member")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("group_id", groupId)
                  .maybeSingle();

                if (!existingMember) {
                  const { error: insertMemberError } = await supabase
                    .from("community_group_member")
                    .insert({
                      user_id: user.id,
                      group_id: groupId,
                      role: "member",
                    });

                  if (insertMemberError) {
                    console.error(
                      "Failed to insert group member:",
                      insertMemberError
                    );
                  }
                }
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
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
