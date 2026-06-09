-- ================================================================
-- Salon Raed — POS System Database Schema
-- Run this in your Supabase SQL Editor
-- SAFE: drops gym-only tables, keeps profiles & system_settings
-- ================================================================

-- ── Enable Extensions ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- pg_query: RPC helper so lib/db.ts can run raw SQL via REST API
-- Used by local dev (next dev) — production uses Hyperdrive instead
-- ================================================================
CREATE OR REPLACE FUNCTION public.pg_query(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql)
  INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pg_query(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pg_query(TEXT) TO authenticated;

-- ================================================================
-- DROP GYM-SPECIFIC TABLES (no longer needed)
-- ================================================================
DROP TABLE IF EXISTS public.class_bookings      CASCADE;
DROP TABLE IF EXISTS public.class_schedules     CASCADE;
DROP TABLE IF EXISTS public.class_types         CASCADE;
DROP TABLE IF EXISTS public.check_ins           CASCADE;
DROP TABLE IF EXISTS public.memberships         CASCADE;
DROP TABLE IF EXISTS public.membership_plans    CASCADE;
DROP TABLE IF EXISTS public.trainers            CASCADE;
DROP TABLE IF EXISTS public.payments            CASCADE;
DROP TABLE IF EXISTS public.members             CASCADE;
DROP TABLE IF EXISTS public.inventory_items     CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.expenses            CASCADE;

-- ================================================================
-- PROFILES (keep as-is — Supabase Auth backbone)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================================================
-- SYSTEM SETTINGS (keep as-is)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

-- ================================================================
-- POS PRODUCTS (replaces inventory_items)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode             TEXT UNIQUE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'other',
  cost_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  sell_price          NUMERIC(10,4) NOT NULL DEFAULT 0,   -- stored in USD
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INVENTORY RESTOCK LOG (with optional expiry tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.inventory_restock_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES public.pos_products(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL,
  cost_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
  expiry_date  DATE,          -- optional expiry month/date
  notes        TEXT,
  restocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- POS SESSIONS (Shift / Drawer Sessions)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  opening_float   NUMERIC(10,4) NOT NULL DEFAULT 0,   -- USD
  closing_float   NUMERIC(10,4),                       -- USD (actual counted)
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes           TEXT
);

-- ================================================================
-- POS TRANSACTIONS (Completed Sales)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  cashier_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash_usd', 'cash_lbp', 'card', 'on_account')),
  subtotal_usd    NUMERIC(10,4) NOT NULL DEFAULT 0,
  subtotal_lbp    NUMERIC(14,0) NOT NULL DEFAULT 0,    -- LBP stored as integer (no decimals)
  lbp_rate        NUMERIC(10,2) NOT NULL DEFAULT 89500, -- rate at time of sale
  cash_tendered_usd NUMERIC(10,4),                     -- how much cashier received
  cash_tendered_lbp NUMERIC(14,0),
  change_usd      NUMERIC(10,4),
  change_lbp      NUMERIC(14,0),
  customer_name   TEXT,                                -- for on_account
  notes           TEXT,
  is_voided       BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at       TIMESTAMPTZ,
  voided_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- POS TRANSACTION ITEMS (Line Items per Sale)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,         -- snapshot in case product is deleted
  quantity        INTEGER NOT NULL,
  unit_price_usd  NUMERIC(10,4) NOT NULL,
  total_usd       NUMERIC(10,4) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- CART AUDIT LOG (Silent shrinkage deterrence)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_cart_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL CHECK (action IN ('item_deleted', 'cart_voided', 'qty_reduced')),
  product_id    UUID REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name  TEXT,
  quantity      INTEGER,
  unit_price    NUMERIC(10,4),
  session_id    UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- PETTY CASH & PAYOUTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_petty_cash (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  cashier_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  flow        TEXT NOT NULL DEFAULT 'out' CHECK (flow IN ('in', 'out')),
  amount_usd  NUMERIC(10,4) NOT NULL DEFAULT 0,
  amount_lbp  NUMERIC(14,0) NOT NULL DEFAULT 0,
  tag         TEXT NOT NULL DEFAULT 'other',  -- e.g. 'delivery', 'supplies', 'salary'
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- DEBT / ON-ACCOUNT LEDGER
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pos_debts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  balance_usd     NUMERIC(10,4) NOT NULL DEFAULT 0,    -- running balance
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_debt_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id     UUID NOT NULL REFERENCES public.pos_debts(id) ON DELETE CASCADE,
  amount_usd  NUMERIC(10,4) NOT NULL,
  amount_lbp  NUMERIC(14,0) NOT NULL DEFAULT 0,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Trigger: keep pos_debts.updated_at fresh
CREATE OR REPLACE FUNCTION public.update_debt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS debt_updated_at ON public.pos_debts;
CREATE TRIGGER debt_updated_at
  BEFORE UPDATE ON public.pos_debts
  FOR EACH ROW EXECUTE PROCEDURE public.update_debt_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_restock_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cart_audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_petty_cash           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_debts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_debt_payments        ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_id);
CREATE POLICY "profiles_service_role" ON public.profiles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- All POS tables: full access for authenticated users (admin & staff)
CREATE POLICY "authenticated_full_access_settings"    ON public.system_settings         FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_products"    ON public.pos_products             FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_restock"     ON public.inventory_restock_log    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_sessions"    ON public.pos_sessions             FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_transactions" ON public.pos_transactions        FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_tx_items"    ON public.pos_transaction_items    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_audit"       ON public.pos_cart_audit_log       FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_petty"       ON public.pos_petty_cash           FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_debts"       ON public.pos_debts                FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_full_access_debt_pmts"   ON public.pos_debt_payments        FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ================================================================
-- SEED DATA
-- ================================================================
INSERT INTO public.system_settings (key, value) VALUES
  ('store_name',    '"POS System"'),
  ('lbp_rate',      '89500'),
  ('receipt_footer', '"Thank you for shopping with us!"'),
  ('staff_permissions', '["dashboard","pos","inventory"]')
ON CONFLICT (key) DO NOTHING;

-- Sample products
INSERT INTO public.pos_products (barcode, name, category, cost_price, sell_price, stock_qty, low_stock_threshold) VALUES
  ('6291003511037', 'Pepsi 330ml',         'drinks',      0.30, 0.75,  50, 10),
  ('6291003511044', 'Pepsi Zero 330ml',    'drinks',      0.30, 0.75,  30, 10),
  ('6291108100037', 'Lay''s Chips 25g',    'snacks',      0.20, 0.50,  40, 10),
  ('6291003522002', 'Water 500ml',         'drinks',      0.10, 0.25, 100, 20),
  ('6291003522019', 'Red Bull 250ml',      'drinks',      0.80, 1.50,  20,  5),
  ('6291003522033', 'Nescafé 3-in-1',      'drinks',      0.15, 0.35,  60, 15),
  ('6291006340004', 'Protein Bar',         'supplements', 1.50, 3.00,  15,  5),
  ('6291006340011', 'Whey Sachet 30g',     'supplements', 2.00, 4.00,  10,  3),
  ('6291003555009', 'Chewing Gum Pack',    'snacks',      0.10, 0.25,  80, 20),
  ('6291003555016', 'Chocolate Bar 40g',   'snacks',      0.40, 0.75,  35, 10)
ON CONFLICT (barcode) DO NOTHING;
