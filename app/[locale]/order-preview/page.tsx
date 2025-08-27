import CheckoutButton from '@/components/checkout-button';

interface PageProps {
  params: { locale: string };
}

export default async function OrderPreviewPage({ params }: PageProps) {
  const { locale } = await params;

  const dummyItem = {
    name: 'T-shirt',
    price: 2000,
    quantity: 1,
    image: 'https://via.placeholder.com/150',
  };

  return (
    <div className="p-8">
      <h1>Order Preview</h1>
      <p>Item: {dummyItem.name}</p>
      <p>Price: ${dummyItem.price / 100}</p>

      <CheckoutButton items={[dummyItem]} locale={locale} />
    </div>
  );
}
