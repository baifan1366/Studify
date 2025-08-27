"use client";

import { useSearchParams } from "next/navigation";

export default function OrderPreviewPageClient() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  return (
    <section>
      {canceled && (
        <p className="text-red-500">Order canceled. Try again later.</p>
      )}
      <form action="/api/checkout_sessions" method="POST">
        <button type="submit">Checkout</button>
      </form>
    </section>
  );
}
