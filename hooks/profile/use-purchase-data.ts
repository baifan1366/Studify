import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/profile/use-user';
import { toast } from 'sonner';

interface PurchaseRecord {
  id: string;
  item_name: string;
  purchase_type: 'course' | 'plugin' | 'resource';
  amount_cents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  order_id: string;
  product_id: string;
}

interface PurchaseStats {
  total_spent_cents: number;
  courses_owned: number;
  active_orders: number;
  last_purchase: {
    date: string;
    item_name: string;
  } | null;
}

interface PurchaseData {
  stats: PurchaseStats;
  purchases: PurchaseRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CreateOrderRequest {
  product_ids: string[];
  currency?: string;
}

interface CreateOrderResponse {
  order_id: string;
  total_cents: number;
  currency: string;
  status: string;
  products: {
    id: string;
    title: string;
    price_cents: number;
  }[];
}

// API functions
const fetchPurchaseData = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
} = {}): Promise<PurchaseData> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/user/purchases?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch purchase data');
  }

  const result = await response.json();
  return result.data;
};

const createOrder = async (orderData: CreateOrderRequest): Promise<CreateOrderResponse> => {
  const response = await fetch('/api/user/purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create order');
  }

  const result = await response.json();
  return result.data;
};

export function usePurchaseData(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
} = {}) {
  const { data: userData } = useUser();
  const userId = userData?.id;

  return useQuery({
    queryKey: ['purchase-data', userId, params],
    queryFn: () => fetchPurchaseData(params),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating orders
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      toast.success(`Order created successfully! Order ID: ${data.order_id}`);
      // Invalidate and refetch purchase data
      queryClient.invalidateQueries({ queryKey: ['purchase-data'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
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
