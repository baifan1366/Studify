'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Item {
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Props {
  items: Item[];
  locale: string;
}

export default function CheckoutButton({ items, locale }: Props) {
  const t = useTranslations('CheckoutButton');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, locale }),
      });

      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? t('loading') : t('checkout')}
    </button>
  );
}
