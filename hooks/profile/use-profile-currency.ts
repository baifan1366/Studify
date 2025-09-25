import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProfileCurrencyResponse {
  currency: string;
}

interface UpdateCurrencyRequest {
  currency: string;
}

// API functions
const fetchProfileCurrency = async (): Promise<ProfileCurrencyResponse> => {
  const response = await fetch('/api/profile/currency', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch currency setting');
  }

  const result = await response.json();
  return result.data;
};

const updateProfileCurrency = async (currencyData: UpdateCurrencyRequest): Promise<ProfileCurrencyResponse> => {
  const response = await fetch('/api/profile/currency', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(currencyData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update currency setting');
  }

  const result = await response.json();
  return result.data;
};

// Hook for fetching profile currency
export function useProfileCurrency() {
  return useQuery({
    queryKey: ['profile-currency'],
    queryFn: fetchProfileCurrency,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for updating profile currency
export function useUpdateProfileCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfileCurrency,
    onSuccess: (data) => {
      toast.success('Currency updated successfully!');
      // Update the cache
      queryClient.setQueryData(['profile-currency'], data);
      // Also invalidate user profile cache in case it's used elsewhere
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['full-profile'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update currency setting');
    },
  });
}

// Helper function to get supported currencies
export const getSupportedCurrencies = () => [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' }
];

// Helper function to get currency symbol
export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = getSupportedCurrencies().find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};
