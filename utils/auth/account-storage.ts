// utils/auth/account-storage.ts

export interface StoredAccount {
  id: string; // user_id from Supabase
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: 'student' | 'tutor' | 'admin';
  last_login: string; // ISO timestamp
  is_current: boolean;
}

export interface AccountCredentials {
  refresh_token?: string;
  access_token?: string;
  // Only store if user explicitly chose "Remember me"
}

const ACCOUNTS_KEY = 'studify_accounts';
const CURRENT_ACCOUNT_KEY = 'studify_current_account';
const MAX_STORED_ACCOUNTS = 5;

export class AccountStorageManager {
  
  /**
   * Get all stored accounts
   */
  static getStoredAccounts(): StoredAccount[] {
    try {
      const stored = localStorage.getItem(ACCOUNTS_KEY);
      if (!stored) return [];
      
      const accounts = JSON.parse(stored) as StoredAccount[];
      return accounts.sort((a, b) => 
        new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
      );
    } catch (error) {
      console.error('Error loading stored accounts:', error);
      return [];
    }
  }

  /**
   * Add or update account in storage
   */
  static storeAccount(account: Omit<StoredAccount, 'is_current'>): void {
    try {
      const accounts = this.getStoredAccounts();
      
      // Remove existing account with same ID
      const filteredAccounts = accounts.filter(a => a.id !== account.id);
      
      // Add new account as current
      const newAccount: StoredAccount = {
        ...account,
        is_current: true,
        last_login: new Date().toISOString()
      };
      
      // Mark other accounts as not current
      const updatedAccounts = filteredAccounts.map(a => ({ ...a, is_current: false }));
      
      // Keep only the most recent MAX_STORED_ACCOUNTS
      const finalAccounts = [newAccount, ...updatedAccounts].slice(0, MAX_STORED_ACCOUNTS);
      
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(finalAccounts));
      localStorage.setItem(CURRENT_ACCOUNT_KEY, account.id);
      
    } catch (error) {
      console.error('Error storing account:', error);
    }
  }

  /**
   * Remove account from storage
   */
  static removeAccount(accountId: string): void {
    try {
      const accounts = this.getStoredAccounts();
      const filteredAccounts = accounts.filter(a => a.id !== accountId);
      
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filteredAccounts));
      
      // If removing current account, clear current
      const currentId = localStorage.getItem(CURRENT_ACCOUNT_KEY);
      if (currentId === accountId) {
        localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      }
      
    } catch (error) {
      console.error('Error removing account:', error);
    }
  }

  /**
   * Mark account as current
   */
  static setCurrentAccount(accountId: string): void {
    try {
      const accounts = this.getStoredAccounts();
      const updatedAccounts = accounts.map(a => ({
        ...a,
        is_current: a.id === accountId,
        last_login: a.id === accountId ? new Date().toISOString() : a.last_login
      }));
      
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
      
    } catch (error) {
      console.error('Error setting current account:', error);
    }
  }

  /**
   * Get current account ID
   */
  static getCurrentAccountId(): string | null {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
  }

  /**
   * Clear all stored accounts
   */
  static clearAllAccounts(): void {
    localStorage.removeItem(ACCOUNTS_KEY);
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
  }

  /**
   * Update account info (after profile changes)
   */
  static updateAccountInfo(accountId: string, updates: Partial<StoredAccount>): void {
    try {
      const accounts = this.getStoredAccounts();
      const updatedAccounts = accounts.map(account => 
        account.id === accountId 
          ? { ...account, ...updates }
          : account
      );
      
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    } catch (error) {
      console.error('Error updating account info:', error);
    }
  }
}
