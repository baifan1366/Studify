import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/profile/use-user';

interface PurchaseRecord {
  id: string;
  item_name: string;
  purchase_type: 'course' | 'subscription' | 'tutoring_session';
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

interface PurchaseStats {
  total_spent_cents: number;
  courses_owned: number;
  active_subscriptions: number;
  last_purchase: {
    date: string;
    item_name: string;
  } | null;
}

interface PurchaseData {
  stats: PurchaseStats;
  purchases: PurchaseRecord[];
}

// Mock data function (replace with real API call)
const fetchPurchaseData = async (userId: string): Promise<PurchaseData> => {
  // This would normally be an API call to /api/user/purchases
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        stats: {
          total_spent_cents: 24500,
          courses_owned: 12,
          active_subscriptions: 3,
          last_purchase: {
            date: '2024-11-15',
            item_name: 'Advanced React Course'
          }
        },
        purchases: [
          {
            id: '1',
            item_name: 'Advanced React Course',
            purchase_type: 'course',
            amount_cents: 8999,
            currency: 'USD',
            status: 'completed',
            created_at: '2024-11-15T10:00:00Z'
          },
          {
            id: '2',
            item_name: 'Python Fundamentals',
            purchase_type: 'course',
            amount_cents: 4999,
            currency: 'USD',
            status: 'completed',
            created_at: '2024-10-28T14:30:00Z'
          },
          {
            id: '3',
            item_name: 'Premium Subscription',
            purchase_type: 'subscription',
            amount_cents: 1999,
            currency: 'USD',
            status: 'completed',
            created_at: '2024-10-10T09:15:00Z'
          },
          {
            id: '4',
            item_name: 'JavaScript Mastery',
            purchase_type: 'course',
            amount_cents: 7500,
            currency: 'USD',
            status: 'completed',
            created_at: '2024-09-22T16:45:00Z'
          }
        ]
      });
    }, 300);
  });
};

export function usePurchaseData() {
  const { data: userData } = useUser();
  const userId = userData?.id;

  return useQuery({
    queryKey: ['purchase-data', userId],
    queryFn: () => fetchPurchaseData(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to format currency
export const formatCurrency = (cents: number, currency: string = 'USD'): string => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Helper function to format date
export const formatPurchaseDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
