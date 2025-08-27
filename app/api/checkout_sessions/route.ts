import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const headersList = await headers();
    const origin = headersList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          // Replace with your real Price ID from Stripe Dashboard
          price: process.env.STRIPE_PRICE_ID ?? "{{PRICE_ID}}",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create Stripe Checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(session.url, 303);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
