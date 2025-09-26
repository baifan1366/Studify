# Studify Stripe Payment System

## 🚀 Overview

The Studify platform now includes a comprehensive Stripe payment system that allows tutors to receive real money from course sales. The system uses Stripe Connect to enable direct payments to tutors while maintaining platform commission.

## 💰 Commission Structure

- **Platform Commission**: 10% of each sale
- **Tutor Earnings**: 90% of each sale
- **Payment Release**: Earnings are held for 7 days before being available for payout

## 🏗️ System Architecture

### Database Schema

#### 1. Tutor Stripe Accounts (`tutor_stripe_accounts`)
Stores Stripe Connect account information for tutors.

```sql
- stripe_account_id: Unique Stripe Connect account ID
- account_status: pending | restricted | enabled | disabled
- charges_enabled: Boolean for accepting payments
- payouts_enabled: Boolean for receiving transfers
- onboarding_completed: Whether setup is complete
```

#### 2. Tutor Earnings (`tutor_earnings`)
Records all earnings from course sales, tutoring sessions, etc.

```sql
- tutor_id: Reference to profiles table
- source_type: course_sale | tutoring_session | commission_bonus
- gross_amount_cents: Total payment from student
- platform_fee_cents: 10% platform commission
- tutor_amount_cents: Amount tutor receives (90%)
- status: pending | released | on_hold | refunded
- release_date: When funds become available (7 days)
- stripe_transfer_id: Stripe transfer reference
```

#### 3. Tutor Payouts (`tutor_payouts`)
Tracks payout batches and their status.

#### 4. Tutor Earnings Summary (`tutor_earnings_summary`)
Cached summary for quick dashboard queries.

### API Endpoints

#### Stripe Connect Management
- `GET/POST /api/tutor/stripe-connect` - Account creation and management
- `GET /api/tutor/earnings` - Earnings data and statistics
- `POST /api/tutor/earnings/release` - Scheduled earnings release (cron job)

#### Payment Processing
- `POST /api/course/order` - Course purchase with Stripe checkout
- `POST /api/course/webhook` - Stripe webhook with earnings allocation

## 🔄 Payment Flow

### 1. Course Purchase
```
Student clicks "Buy Course" 
→ Stripe Checkout Session created
→ Student completes payment
→ Webhook receives payment confirmation
→ Student enrolled in course
→ Tutor earnings record created (pending status)
→ Platform fee calculated and recorded
```

### 2. Earnings Release
```
Scheduled job runs daily at 2 AM UTC
→ Finds earnings older than 7 days
→ Updates status from 'pending' to 'released'
→ Creates Stripe transfers for tutors with active accounts
→ Records transfer IDs and status
```

### 3. Tutor Onboarding
```
Tutor visits profile page
→ Sees "Payment Setup Required" if no Stripe account
→ Clicks "Set Up Payments"
→ Redirected to Stripe Connect onboarding
→ Completes identity verification and banking info
→ Account becomes active for receiving payments
```

## 🧩 Frontend Components

### StripeConnectSetup Component
`components/tutor/stripe-connect-setup.tsx`

Shows different states:
- **Setup Required**: No Stripe account exists
- **Onboarding Incomplete**: Account exists but not fully verified
- **Active**: Account ready to receive payments

Features:
- One-click account creation
- Status indicators with colors
- Direct links to Stripe dashboard
- Account details display

### Earnings Display
Uses the updated `useEarningsData` hook that:
- Prioritizes new `tutor_earnings` table data
- Falls back to legacy course order data
- Provides real-time statistics and transaction history

## 🛠️ Setup Instructions

### 1. Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=your_secure_cron_secret
```

### 2. Database Migration
Run the earnings system migration:
```sql
-- Execute db/migrations/20250925_tutor_earnings_system.sql
```

### 3. Webhook Configuration
Configure Stripe webhook endpoint:
- URL: `https://your-domain.com/api/course/webhook`
- Events: `checkout.session.completed`, `payment_intent.payment_failed`

### 4. Scheduled Jobs
Configure cron job (automatically handled by Vercel):
```json
{
  "crons": [
    {
      "path": "/api/tutor/earnings/release",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## 🔒 Security Features

- **Role-based Authorization**: All endpoints use proper role checking
- **Webhook Signature Verification**: Stripe webhooks are cryptographically verified
- **Data Isolation**: Tutors can only access their own earnings
- **Audit Trail**: All transactions are logged with metadata
- **Error Handling**: Comprehensive error recovery and logging

## 📊 Analytics & Reporting

### Tutor Dashboard
- Total earnings (all time)
- Monthly earnings (current month)
- Pending payouts (awaiting release)
- Student count and course sales
- Growth percentage (month-over-month)
- Transaction history with filtering

### Monthly Breakdown
- Course sales revenue
- Tutoring session income
- Commission bonuses
- Status indicators (current/paid)

## 🚨 Error Handling

### Common Scenarios
1. **Tutor without Stripe account**: Earnings recorded but marked as pending transfer
2. **Failed transfers**: Earnings marked as "on_hold" with error details
3. **Incomplete onboarding**: Clear status messages and next steps
4. **Webhook failures**: Retry logic and error logging

### Monitoring
- All operations are logged with timestamps
- Failed operations are marked with error details
- Dashboard shows clear status indicators

## 🧪 Testing

### Development Testing
```bash
# Manual earnings release (development only)
GET /api/tutor/earnings/release

# Test Stripe Connect flow
POST /api/tutor/stripe-connect
```

### Test Payment Flow
1. Create test course as tutor
2. Purchase course as student using Stripe test cards
3. Verify earnings record creation
4. Test earnings release with manual trigger
5. Confirm Stripe transfer creation

## 🔄 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migration executed
- [ ] Stripe webhook configured and verified
- [ ] Test payment flow end-to-end
- [ ] Verify cron job scheduling
- [ ] Check error monitoring and logging

## 📞 Support

### For Tutors
- Payment setup guidance in profile page
- Clear status indicators and next steps
- Direct links to Stripe dashboard for account management

### For Students
- Secure Stripe checkout process
- Immediate enrollment after payment
- Payment confirmation and receipts

---

## 🎯 Key Benefits

✅ **Real Money Transfers**: Tutors receive actual payments, not platform credits
✅ **Automatic Processing**: Payments and earnings handled automatically
✅ **Platform Protection**: 7-day holding period for dispute protection
✅ **Transparent Commission**: Clear 90/10 split shown to tutors
✅ **Scalable Architecture**: Handles high volume of transactions
✅ **Compliance Ready**: Proper tax reporting and audit trails
