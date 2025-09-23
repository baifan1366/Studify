# Account Switcher Implementation Guide

## 🎯 Overview

This document describes the Account Switcher implementation for Studify, allowing users to seamlessly switch between multiple accounts without logging out and back in.

## 🏗️ Architecture

### Core Components

1. **AccountStorageManager** (`utils/auth/account-storage.ts`)
   - Manages localStorage-based account storage
   - Handles account CRUD operations
   - Maintains account metadata and login timestamps

2. **Switch Account API** (`app/api/auth/switch-account/route.ts`)
   - Server-side account switching logic
   - Session management and JWT generation
   - User verification and role checking

3. **useAccountSwitcher Hook** (`hooks/auth/use-account-switcher.ts`)
   - React hook for account management
   - Handles account switching, adding, and removal
   - Integrates with React Query for state management

4. **Enhanced User Profile Popover** (`components/user-profile-popover.tsx`)
   - UI component for account switching
   - Visual account list with role badges
   - Account addition and removal controls

## 📦 Implementation Details

### Account Storage Structure

```typescript
interface StoredAccount {
  id: string;           // Supabase user_id
  email: string;        // User email
  display_name?: string; // Display name
  avatar_url?: string;  // Profile avatar
  role: 'student' | 'tutor' | 'admin';
  last_login: string;   // ISO timestamp
  is_current: boolean;  // Current active account
}
```

### API Endpoints

#### Switch Account
```
POST /api/auth/switch-account
Body: {
  target_user_id: string;
  email?: string; // Optional verification
}
```

#### Session Cleanup
```
POST /api/auth/cleanup-sessions
Body: {
  cleanup_user_id: string;
  keep_current?: boolean;
}
```

### Enhanced Sign-in Flow

The sign-in API now supports multiple modes:
- `login`: Regular login (default)
- `add`: Add new account to existing session
- `switch`: Switch to different account

```javascript
// Example: Adding a new account
fetch('/api/auth/sign-in', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    mode: 'add'
  })
});
```

## 🎨 UI Features

### Account List
- Displays all stored accounts with avatars
- Shows role badges (admin, tutor, student)
- Highlights current active account
- Hover effects and animations

### Account Management
- ➕ Add new account button
- ❌ Remove account (hover to show)
- ✅ Current account indicator
- 🔄 Loading states during switching

### Visual Design
- Modern glass-morphism effects
- Gradient backgrounds and role-specific colors
- Smooth animations and transitions
- Dark mode support

## 🔧 Usage Examples

### Basic Usage in Components

```typescript
import { useAccountSwitcher } from '@/hooks/auth/use-account-switcher';

function MyComponent() {
  const {
    storedAccounts,
    currentAccountId,
    switchToAccount,
    addAccount,
    isSwitching
  } = useAccountSwitcher();

  return (
    <div>
      {storedAccounts.map(account => (
        <button
          key={account.id}
          onClick={() => switchToAccount(account.id)}
          disabled={isSwitching}
        >
          {account.email} ({account.role})
        </button>
      ))}
      <button onClick={addAccount}>Add Account</button>
    </div>
  );
}
```

### Handle Login Success

```typescript
function LoginForm() {
  const { handleLoginSuccess } = useAccountSwitcher();

  const onSubmit = async (data) => {
    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ ...data, mode: 'add' })
    });
    
    const result = await response.json();
    handleLoginSuccess(result); // Stores account if mode === 'add'
  };
}
```

## 🔒 Security Considerations

### Session Management
- Each account switch generates new JWT
- Old sessions are properly cleaned up
- Redis-based session storage with TTL

### Data Protection
- Account data stored in localStorage (client-side only)
- No sensitive credentials stored locally
- Server-side user verification for all switches

### Access Control
- Role-based switching permissions
- User must exist and be active to switch
- Email verification for additional security

## 🌍 Internationalization

Added translations for account switcher:

```json
{
  "UserProfile": {
    "switch_account": "Switch Account",
    "accounts": "Accounts",
    "add_account": "Add another account",
    "remove_account": "Remove account",
    "switching_account": "Switching account...",
    "switch_error": "Failed to switch account",
    "current_account": "Current account"
  }
}
```

## 🧪 Testing Checklist

### Basic Functionality
- [ ] User can view stored accounts in popover
- [ ] Current account is highlighted correctly
- [ ] Account switching works without errors
- [ ] New accounts can be added via "Add Account"
- [ ] Accounts can be removed (except current)

### Edge Cases
- [ ] Switching to same account (should be no-op)
- [ ] Switching while already switching (should be disabled)
- [ ] Network errors during switching
- [ ] Invalid account IDs
- [ ] Banned/inactive accounts

### UI/UX
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Animations work smoothly
- [ ] Dark mode compatibility
- [ ] Mobile responsiveness

### Security
- [ ] JWT validation works correctly
- [ ] Session cleanup on switch
- [ ] Unauthorized switching blocked
- [ ] No sensitive data in localStorage

## 🚀 Deployment Notes

### Environment Variables
Ensure these are set in production:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
APP_JWT_SECRET=your-secret-key
```

### Database Considerations
- No database schema changes required
- Uses existing `profiles` table
- Redis required for session management

### Performance
- localStorage operations are synchronous
- Account list cached in React state
- Redis sessions with TTL for automatic cleanup

## 🔄 Migration Guide

### From Existing System
1. No breaking changes to existing auth system
2. Account storage is opt-in (only when users switch)
3. Existing sessions continue to work normally
4. UI enhancement to profile popover

### Future Enhancements
- [ ] Account sync across devices
- [ ] SSO integration
- [ ] Advanced role-based switching rules
- [ ] Account analytics and usage tracking

## 📞 Support

For issues or questions about the Account Switcher:
1. Check console for error messages
2. Verify localStorage content
3. Check Redis session storage
4. Review API response logs

---

*This implementation provides a seamless multi-account experience while maintaining security and performance standards.*
