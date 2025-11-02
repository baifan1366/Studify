import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements: any;
  capabilities: any;
  country: string;
  default_currency: string;
}

interface StripeConnectResponse {
  success: boolean;
  account_exists: boolean;
  account: StripeConnectAccount | null;
}

interface CreateAccountResponse {
  success: boolean;
  account_id: string;
  onboarding_url: string;
}

interface OnboardingLinkResponse {
  success: boolean;
  onboarding_url: string;
}

interface DashboardLinkResponse {
  success: boolean;
  dashboard_url: string;
}

// Get Stripe Connect account status
export function useStripeConnectAccount() {
  return useQuery<StripeConnectResponse>({
    queryKey: ['stripe-connect-account'],
    queryFn: () => apiSend({
      url: '/api/tutor/stripe-connect',
      method: 'GET',
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create Stripe Connect account
export function useCreateStripeConnectAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<CreateAccountResponse, Error, { return_url?: string; refresh_url?: string }>({
    mutationFn: (data) => apiSend({
      url: '/api/tutor/stripe-connect',
      method: 'POST',
      body: {
        action: 'create_account',
        ...data,
      },
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-account'] });
      toast({
        title: 'Account Created',
        description: 'Your Stripe Connect account has been created. Please complete the onboarding process.',
      });
      
      // Redirect to onboarding
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      }
    },
    onError: (error) => {
      toast({
        title: 'Account Creation Failed',
        description: error.message || 'Failed to create Stripe Connect account',
        variant: 'destructive',
      });
    },
  });
}

// Get fresh onboarding link
export function useGetOnboardingLink() {
  const { toast } = useToast();

  return useMutation<OnboardingLinkResponse, Error, { return_url?: string; refresh_url?: string }>({
    mutationFn: (data) => apiSend({
      url: '/api/tutor/stripe-connect',
      method: 'POST',
      body: {
        action: 'get_onboarding_link',
        ...data,
      },
    }),
    onSuccess: (data) => {
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      }
    },
    onError: (error) => {
      toast({
        title: 'Onboarding Link Failed',
        description: error.message || 'Failed to get onboarding link',
        variant: 'destructive',
      });
    },
  });
}

// Get Stripe dashboard link
export function useGetDashboardLink() {
  const { toast } = useToast();

  return useMutation<DashboardLinkResponse, Error, void>({
    mutationFn: () => apiSend({
      url: '/api/tutor/stripe-connect',
      method: 'POST',
      body: {
        action: 'get_dashboard_link',
      },
    }),
    onSuccess: (data) => {
      if (data.dashboard_url) {
        window.open(data.dashboard_url, '_blank');
      }
    },
    onError: (error) => {
      toast({
        title: 'Dashboard Access Failed',
        description: error.message || 'Failed to access Stripe dashboard',
        variant: 'destructive',
      });
    },
  });
}

// Helper function to check if account is fully set up
export function isAccountFullySetup(data: StripeConnectResponse | null | undefined): boolean {
  if (!data || !data.account) return false;
  const account = data.account;
  
  return (
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled &&
    (!account.requirements?.currently_due || account.requirements.currently_due.length === 0)
  );
}

// Helper function to get account status text
export function getAccountStatusText(data: StripeConnectResponse | null | undefined): string {
  if (!data || !data.account) return 'Not connected';
  const account = data.account;
  
  if (isAccountFullySetup(data)) {
    return 'Active';
  }
  
  if (account.details_submitted && !account.charges_enabled) {
    return 'Under review';
  }
  
  if (!account.details_submitted) {
    return 'Onboarding incomplete';
  }
  
  return 'Setup required';
}

// Helper function to get status color
export function getAccountStatusColor(data: StripeConnectResponse | null | undefined): string {
  if (!data || !data.account) return 'bg-gray-400';
  
  if (isAccountFullySetup(data)) {
    return 'bg-green-400';
  }
  
  if (data.account.details_submitted) {
    return 'bg-yellow-400';
  }
  
  return 'bg-red-400';
}
