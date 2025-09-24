import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/profile/use-user';

interface EarningsRecord {
  id: string;
  source_type: 'course_sale' | 'tutoring_session' | 'commission';
  student_name?: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'released' | 'on_hold';
  created_at: string;
}

interface MonthlyEarnings {
  month: string;
  year: number;
  total_cents: number;
  course_sales_cents: number;
  tutoring_cents: number;
  status: 'current' | 'paid';
}

interface EarningsStats {
  total_earnings_cents: number;
  monthly_earnings_cents: number;
  pending_payout_cents: number;
  students_count: number;
  growth_percentage: number;
}

interface EarningsData {
  stats: EarningsStats;
  monthly_breakdown: MonthlyEarnings[];
  recent_transactions: EarningsRecord[];
}

// Mock data function (replace with real API call)
const fetchEarningsData = async (tutorId: string): Promise<EarningsData> => {
  // This would normally be an API call to /api/tutor/earnings
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        stats: {
          total_earnings_cents: 284700,
          monthly_earnings_cents: 48500,
          pending_payout_cents: 12700,
          students_count: 23,
          growth_percentage: 12
        },
        monthly_breakdown: [
          {
            month: 'November',
            year: 2024,
            total_cents: 48500,
            course_sales_cents: 32000,
            tutoring_cents: 16500,
            status: 'current'
          },
          {
            month: 'October',
            year: 2024,
            total_cents: 39800,
            course_sales_cents: 26800,
            tutoring_cents: 13000,
            status: 'paid'
          },
          {
            month: 'September',
            year: 2024,
            total_cents: 54200,
            course_sales_cents: 40200,
            tutoring_cents: 14000,
            status: 'paid'
          }
        ],
        recent_transactions: [
          {
            id: '1',
            source_type: 'tutoring_session',
            student_name: 'Sarah Johnson',
            amount_cents: 4500,
            currency: 'USD',
            status: 'pending',
            created_at: '2024-11-20T15:30:00Z'
          },
          {
            id: '2',
            source_type: 'course_sale',
            student_name: undefined,
            amount_cents: 6299,
            currency: 'USD',
            status: 'pending',
            created_at: '2024-11-18T09:20:00Z'
          },
          {
            id: '3',
            source_type: 'tutoring_session',
            student_name: 'Michael Chen',
            amount_cents: 5000,
            currency: 'USD',
            status: 'released',
            created_at: '2024-11-15T14:45:00Z'
          }
        ]
      });
    }, 400);
  });
};

export function useEarningsData() {
  const { data: userData } = useUser();
  const userId = userData?.id;

  return useQuery({
    queryKey: ['earnings-data', userId],
    queryFn: () => fetchEarningsData(userId!),
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
    return 'React Course Sale'; // This could be fetched from course data
  }
  return 'Commission';
};
