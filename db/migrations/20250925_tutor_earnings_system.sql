-- Tutor Earnings and Payout System
-- This migration adds tables to handle tutor earnings, platform commission, and payouts

-- =========================
-- TUTOR STRIPE CONNECT ACCOUNTS
-- =========================
CREATE TABLE IF NOT EXISTS tutor_stripe_accounts (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tutor_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_status text NOT NULL CHECK (account_status IN ('pending', 'restricted', 'enabled', 'disabled')) DEFAULT 'pending',
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  country text NOT NULL DEFAULT 'MY',
  currency text NOT NULL DEFAULT 'MYR',
  account_type text DEFAULT 'express',
  onboarding_completed boolean DEFAULT false,
  onboarding_url text,
  requirements jsonb DEFAULT '{}',
  capabilities jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- EARNINGS TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS tutor_earnings (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tutor_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('course_sale', 'tutoring_session', 'commission_bonus')),
  source_id bigint, -- references course_order.id, tutoring_session.id, etc.
  gross_amount_cents int NOT NULL, -- Total payment from student
  platform_fee_cents int NOT NULL, -- Platform commission (default 10%)
  tutor_amount_cents int NOT NULL, -- Amount tutor receives (gross - platform_fee)
  currency text NOT NULL DEFAULT 'MYR',
  status text NOT NULL CHECK (status IN ('pending', 'released', 'on_hold', 'refunded')) DEFAULT 'pending',
  release_date timestamptz, -- When funds are available for payout (7 days after sale)
  payout_id bigint, -- references tutor_payouts.id when paid out
  payment_intent_id text, -- Stripe payment intent ID
  stripe_transfer_id text, -- Stripe Connect transfer ID
  metadata jsonb DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- PAYOUT MANAGEMENT
-- =========================
CREATE TABLE IF NOT EXISTS tutor_payouts (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tutor_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payout_id text UNIQUE,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'MYR',
  status text NOT NULL CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')) DEFAULT 'pending',
  payout_method text DEFAULT 'standard', -- standard, instant
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  failure_code text,
  failure_message text,
  metadata jsonb DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =========================
-- EARNINGS SUMMARY/STATS (For quick dashboard queries)
-- =========================
CREATE TABLE IF NOT EXISTS tutor_earnings_summary (
  id bigserial PRIMARY KEY,
  tutor_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_earnings_cents int DEFAULT 0,
  pending_earnings_cents int DEFAULT 0,
  released_earnings_cents int DEFAULT 0,
  paid_out_earnings_cents int DEFAULT 0,
  current_month_earnings_cents int DEFAULT 0,
  previous_month_earnings_cents int DEFAULT 0,
  total_sales_count int DEFAULT 0,
  students_taught_count int DEFAULT 0,
  courses_sold_count int DEFAULT 0,
  last_payout_at timestamptz,
  next_payout_date timestamptz,
  currency text NOT NULL DEFAULT 'MYR',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- INDEXES FOR PERFORMANCE
-- =========================
CREATE INDEX IF NOT EXISTS idx_tutor_stripe_accounts_tutor_id ON tutor_stripe_accounts(tutor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tutor_stripe_accounts_stripe_id ON tutor_stripe_accounts(stripe_account_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_tutor_earnings_tutor_id ON tutor_earnings(tutor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_status ON tutor_earnings(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_source ON tutor_earnings(source_type, source_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tutor_earnings_release_date ON tutor_earnings(release_date) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_tutor_payouts_tutor_id ON tutor_payouts(tutor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tutor_payouts_status ON tutor_payouts(status) WHERE is_deleted = false;

-- =========================
-- TRIGGERS FOR AUTO-UPDATING SUMMARY
-- =========================
CREATE OR REPLACE FUNCTION update_tutor_earnings_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update summary when earnings change
  INSERT INTO tutor_earnings_summary (tutor_id, currency)
  VALUES (NEW.tutor_id, NEW.currency)
  ON CONFLICT (tutor_id) DO NOTHING;
  
  -- Recalculate totals
  UPDATE tutor_earnings_summary 
  SET 
    total_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND is_deleted = false
    ),
    pending_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'pending' AND is_deleted = false
    ),
    released_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'released' AND is_deleted = false
    ),
    paid_out_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND status = 'released' AND payout_id IS NOT NULL AND is_deleted = false
    ),
    current_month_earnings_cents = (
      SELECT COALESCE(SUM(tutor_amount_cents), 0) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id 
        AND created_at >= date_trunc('month', now()) 
        AND is_deleted = false
    ),
    total_sales_count = (
      SELECT COUNT(*) 
      FROM tutor_earnings 
      WHERE tutor_id = NEW.tutor_id AND is_deleted = false
    ),
    updated_at = now()
  WHERE tutor_id = NEW.tutor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tutor_earnings_summary
  AFTER INSERT OR UPDATE ON tutor_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_tutor_earnings_summary();

-- =========================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =========================

-- Function to calculate platform fee (default 10%)
CREATE OR REPLACE FUNCTION calculate_platform_fee(gross_amount_cents int)
RETURNS int AS $$
BEGIN
  -- Default 10% platform fee
  RETURN GREATEST(FLOOR(gross_amount_cents * 0.10), 0);
END;
$$ LANGUAGE plpgsql;

-- Function to release pending earnings (call this in a scheduled job)
CREATE OR REPLACE FUNCTION release_eligible_earnings()
RETURNS int AS $$
DECLARE
  updated_count int;
BEGIN
  -- Release earnings that are 7 days old
  UPDATE tutor_earnings 
  SET 
    status = 'released',
    updated_at = now()
  WHERE 
    status = 'pending' 
    AND created_at <= now() - interval '7 days'
    AND is_deleted = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get tutor monthly breakdown
CREATE OR REPLACE FUNCTION get_tutor_monthly_breakdown(target_tutor_id bigint, months_back int DEFAULT 3)
RETURNS TABLE(
  month text,
  year int,
  total_cents int,
  course_sales_cents int,
  tutoring_cents int,
  commission_cents int,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(date_trunc('month', te.created_at), 'Month') as month,
    EXTRACT(year FROM date_trunc('month', te.created_at))::int as year,
    SUM(te.tutor_amount_cents)::int as total_cents,
    SUM(CASE WHEN te.source_type = 'course_sale' THEN te.tutor_amount_cents ELSE 0 END)::int as course_sales_cents,
    SUM(CASE WHEN te.source_type = 'tutoring_session' THEN te.tutor_amount_cents ELSE 0 END)::int as tutoring_cents,
    SUM(CASE WHEN te.source_type = 'commission_bonus' THEN te.tutor_amount_cents ELSE 0 END)::int as commission_cents,
    CASE 
      WHEN date_trunc('month', te.created_at) = date_trunc('month', now()) THEN 'current'
      ELSE 'paid'
    END as status
  FROM tutor_earnings te
  WHERE 
    te.tutor_id = target_tutor_id 
    AND te.is_deleted = false
    AND te.created_at >= date_trunc('month', now()) - interval '1 month' * months_back
  GROUP BY date_trunc('month', te.created_at)
  ORDER BY date_trunc('month', te.created_at) DESC;
END;
$$ LANGUAGE plpgsql;
