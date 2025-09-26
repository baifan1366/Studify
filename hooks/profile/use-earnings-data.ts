import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/profile/use-user';
import { toast } from 'sonner';

interface EarningsRecord {
  id: string;
  source_type: 'course_sale' | 'tutoring_session' | 'commission';
  student_name?: string;
  course_name?: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'released' | 'on_hold';
  created_at: string;
  order_id?: string;
}

interface MonthlyEarnings {
  month: string;
  year: number;
  total_cents: number;
  course_sales_cents: number;
  tutoring_cents: number;
  commission_cents: number;
  status: 'current' | 'paid';
}

interface EarningsStats {
  total_earnings_cents: number;
  monthly_earnings_cents: number;
  pending_payout_cents: number;
  students_count: number;
  growth_percentage: number;
  courses_sold: number;
}

interface EarningsData {
  stats: EarningsStats;
  monthly_breakdown: MonthlyEarnings[];
  recent_transactions: EarningsRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PayoutRequest {
  amount_cents: number;
  payment_method?: string;
}

interface PayoutResponse {
  amount_cents: number;
  payment_method: string;
  status: string;
  estimated_processing_days: number;
}

// API functions
const fetchEarningsData = async (params: {
  months?: number;
  page?: number;
  limit?: number;
} = {}): Promise<EarningsData> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/tutor/earnings?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch earnings data');
  }

  const result = await response.json();
  return result.data;
};

const requestPayout = async (payoutData: PayoutRequest): Promise<PayoutResponse> => {
  const response = await fetch('/api/tutor/earnings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payoutData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request payout');
  }

  const result = await response.json();
  return result.data;
};

export function useEarningsData(params: {
  months?: number;
  page?: number;
  limit?: number;
} = {}) {
  const { data: userData } = useUser();
  const userId = userData?.id;
  const isTutor = userData?.role === 'tutor';

  return useQuery({
    queryKey: ['earnings-data', userId, params],
    queryFn: () => fetchEarningsData(params),
    enabled: !!userId && isTutor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for requesting payouts
export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestPayout,
    onSuccess: (data) => {
      toast.success(`Payout request submitted! Processing time: ${data.estimated_processing_days} days`);
      // Invalidate and refetch earnings data
      queryClient.invalidateQueries({ queryKey: ['earnings-data'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to request payout');
    },
  });
}

// Helper function to format currency
export const formatCurrency = (cents: number, currency: string = 'MYR'): string => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Helper function to format date
export const formatTransactionDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to get display name for transaction
export const getTransactionDisplayName = (transaction: EarningsRecord): string => {
  if (transaction.source_type === 'tutoring_session') {
    return transaction.student_name || 'Unknown Student';
  } else if (transaction.source_type === 'course_sale') {
    return transaction.course_name || 'Course Sale';
  }
  return 'Commission';
};

// Helper function to get transaction description
export const getTransactionDescription = (transaction: EarningsRecord): string => {
  if (transaction.source_type === 'course_sale') {
    return `Course: ${transaction.course_name || 'Unknown Course'}`;
  } else if (transaction.source_type === 'tutoring_session') {
    return `Tutoring session with ${transaction.student_name || 'Unknown Student'}`;
  }
  return 'Commission payment';
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'released':
      return 'text-green-600 bg-green-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'on_hold':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};
