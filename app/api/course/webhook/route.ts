import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

/**
 * Handle classroom creation and joining after enrollment
 * Implements COURSE.md L15-20 flow
 */
async function handleClassroomFlow(supabase: any, course: any, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[ClassroomFlow] Starting classroom flow for user ${userId}, course ${course.slug}`);
    
    // Check if classroom exists for this course slug
    const { data: existingClassroom, error: classroomError } = await supabase
      .from('classroom')
      .select('*')
      .eq('slug', course.slug)
      .maybeSingle(); // Use maybeSingle to handle "not found" gracefully

    if (classroomError) {
      console.error('[ClassroomFlow] Failed to lookup classroom:', classroomError);
      return { success: false, error: `Failed to lookup classroom: ${classroomError.message}` };
    }

    let classroomId;

    if (!existingClassroom) {
      console.log(`[ClassroomFlow] Creating new classroom for course ${course.slug}`);
      // Create new classroom if doesn't exist
      const { data: newClassroom, error: createError } = await supabase
        .from('classroom')
        .insert({
          name: course.title,
          description: `Classroom for ${course.title}`,
          slug: course.slug,
          visibility: 'private',
          owner_id: course.owner_id,
          class_code: generateClassCode(),
        })
        .select()
        .single();

      if (createError) {
        console.error('[ClassroomFlow] Failed to create classroom:', createError);
        return { success: false, error: `Failed to create classroom: ${createError.message}` };
      }
      
      if (!newClassroom) {
        console.error('[ClassroomFlow] Classroom created but no data returned');
        return { success: false, error: 'Classroom created but no data returned' };
      }
      
      classroomId = newClassroom.id;
      console.log(`[ClassroomFlow] Created classroom with ID ${classroomId}`);
    } else {
      classroomId = existingClassroom.id;
      console.log(`[ClassroomFlow] Using existing classroom with ID ${classroomId}`);
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to handle "not found" gracefully

    if (membershipError) {
      console.error('[ClassroomFlow] Failed to check existing membership:', membershipError);
      return { success: false, error: `Failed to check membership: ${membershipError.message}` };
    }

    if (!existingMembership) {
      console.log(`[ClassroomFlow] Adding user ${userId} to classroom ${classroomId}`);
      const { error: joinError } = await supabase
        .from('classroom_member')
        .insert({
          classroom_id: classroomId,
          user_id: userId,
          role: 'student',
          status: 'active'
        });

      if (joinError) {
        console.error('[ClassroomFlow] Failed to join classroom:', joinError);
        return { success: false, error: `Failed to join classroom: ${joinError.message}` };
      }
      console.log(`[ClassroomFlow] Successfully joined user ${userId} to classroom ${classroomId}`);
    } else {
      console.log(`[ClassroomFlow] User ${userId} is already a member of classroom ${classroomId}`);
    }

    console.log(`[ClassroomFlow] Classroom flow completed successfully for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[ClassroomFlow] Unexpected error in classroom flow:', error);
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Generate a random class code
 */
function generateClassCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received Stripe webhook request');
  
  try {
    const body = await request.text();
    const signature = (await headers()).get("stripe-signature");

    console.log('[Webhook] Body length:', body.length);
    console.log('[Webhook] Has signature:', !!signature);
    console.log('[Webhook] Webhook secret configured:', !!webhookSecret);

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
      console.log('[Webhook] Event type:', event.type);
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        console.log('[Webhook] Processing checkout.session.completed');
        const session = event.data.object;
        
        if (!session.metadata) {
          console.error('[Webhook] Missing session metadata');
          return NextResponse.json({ error: "Missing session metadata" }, { status: 400 });
        }
        
        const { orderId, courseId, userId } = session.metadata;
        console.log('[Webhook] Session metadata:', { orderId, courseId, userId });

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
          console.log('[Webhook] Creating enrollment for user:', user.id, 'course:', course.id);
          
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
            console.log('[Webhook] Enrollment successful, handling classroom flow');
            // After enrollment, handle classroom creation/joining as per COURSE.md L15-20
            const classroomResult = await handleClassroomFlow(supabase, course, user.id);
            if (!classroomResult.success) {
              console.error('[Webhook] Classroom flow failed:', classroomResult.error);
              // Log error but don't fail the entire webhook - enrollment was successful
            } else {
              console.log('[Webhook] Classroom flow completed successfully');
            }
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

    console.log('[Webhook] Successfully processed webhook event');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
