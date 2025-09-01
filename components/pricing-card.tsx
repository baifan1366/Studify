"use client";

import { Button } from "@/components/ui/button";
import { ProductWithPrices } from "@updatedev/js";
import { createUpdateClient } from "@/utils/update/client";
import { useState } from "react";
import { useTranslations } from 'next-intl';

interface PricingCardProps {
  product: ProductWithPrices;
  isCurrentPlan: boolean;
  interval: "month" | "year" | "one-time";
}

export default function PricingCard({
  product,
  isCurrentPlan,
  interval,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('PricingCard');

  function getCurrencySymbol(currency_id: string) {
    // This is just an example, and doesn't cover all currencies
    // supported by Update
    switch (currency_id) {
      case "usd":
        return "$";
      case "eur":
        return "€";
      case "gbp":
        return "£";
      case "cad":
        return "$";
      case "aud":
        return "$";
      default:
        return currency_id;
    }
  }

  async function handleSelectPlan(priceId: string) {
    setIsLoading(true);
    const client = createUpdateClient();
    const redirectUrl = `http://localhost:3000/protected/subscription`;
    const { data, error } = await client.billing.createCheckoutSession(
      priceId,
      {
        redirect_url: redirectUrl,
      }
    );
    if (error) {
      setIsLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  const productPrice = product.prices?.find(
    price =>
      price.interval === interval ||
      (price.type === "one-time" && interval === "one-time")
  );

  if (!productPrice) {
    return null;
  }

  const { name, description } = product;

  const currency = productPrice.currency;
  const symbol = getCurrencySymbol(currency);
  const priceString = productPrice.unit_amount
    ? `${symbol}${(productPrice.unit_amount / 100).toFixed(2)}`
    : t('custom_price');

  return (
    <div className={`border rounded-lg p-6 space-y-4`}>
      <div className="space-y-2">
        <h3 className="text-xl font-medium">{name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{priceString}</span>
          {productPrice?.unit_amount && (
            <span className="text-muted-foreground">{t('per_month_suffix')}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        <Button
          className="w-full"
          onClick={() => handleSelectPlan(productPrice.id)}
          disabled={isLoading || isCurrentPlan}
          variant={isCurrentPlan ? "secondary" : "default"}
        >
          {isCurrentPlan ? t('current_plan') : t('select_plan')}
        </Button>
      </div>
    </div>
  );
}
