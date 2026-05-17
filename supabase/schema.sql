-- ================================================================
-- Salon Raed — Supabase Database Schema (Consolidated)
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ================================================================

-- ── Enable Extensions ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PROFILES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'staff', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
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
-- MEMBERSHIP PLANS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10, 4) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features      JSONB DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- MEMBERS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.members (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_of_birth           DATE,
  gender                  TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  address                 TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  notes                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused', 'expired')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- MEMBERSHIPS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TRAINERS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trainers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bio             TEXT,
  certifications  TEXT[] DEFAULT '{}',
  specialties     TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- CLASS TYPES & SCHEDULES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.class_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6c63ff',
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_schedules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_type_id UUID NOT NULL REFERENCES public.class_types(id) ON DELETE CASCADE,
  trainer_id    UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  capacity      INTEGER NOT NULL DEFAULT 20,
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_bookings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  booked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, member_id)
);

-- ================================================================
-- PAYMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  membership_id   UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  amount          NUMERIC(10, 4) NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ -- Soft delete support
);

-- ================================================================
-- CHECK-INS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.check_ins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes           TEXT
);

-- ================================================================
-- INVENTORY (Merged from inventory_migration.sql)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('drinks', 'snacks', 'supplements', 'other')),
  cost_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  sell_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('sale', 'restock')),
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10,4) NOT NULL,
  total_amount NUMERIC(10,4) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- EXPENSES (New)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT NOT NULL CHECK (type IN ('expense', 'salary')),
  title        TEXT NOT NULL,
  amount       NUMERIC(10, 4) NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- SYSTEM SETTINGS (New)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings       ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated users can read; update own
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Profiles updateable by own user" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_id);
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- General tables: Full access for authenticated users (Admin/Staff)
-- In a more complex app, you'd check profile.role here.
CREATE POLICY "Authenticated users full access" ON public.members FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access plans" ON public.membership_plans FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access memberships" ON public.memberships FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access trainers" ON public.trainers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access class_types" ON public.class_types FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access schedules" ON public.class_schedules FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access bookings" ON public.class_bookings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access payments" ON public.payments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access check_ins" ON public.check_ins FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access inventory_transactions" ON public.inventory_transactions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access expenses" ON public.expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Authenticated users full access settings" ON public.system_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ================================================================
-- SEED DATA
-- ================================================================
INSERT INTO public.membership_plans (name, description, price, duration_days, features, is_active) VALUES
  ('Basic Monthly',   'Access to gym equipment and locker rooms',        29.99, 30,  '["Gym access", "Locker room", "Free parking"]', TRUE),
  ('Premium Monthly', 'Full access including classes and personal area', 59.99, 30,  '["Gym access", "All classes", "Sauna", "Personal locker", "Free parking"]', TRUE),
  ('Quarterly',       'Save with a 3-month membership',                  99.99, 90,  '["Gym access", "All classes", "Sauna", "Free parking"]', TRUE),
  ('Annual',          'Best value — full year unlimited access',        199.99, 365, '["Gym access", "All classes", "Sauna", "Personal trainer session", "Free parking"]', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.class_types (name, description, color) VALUES
  ('Yoga',       'Mind and body balance sessions',    '#10b981'),
  ('CrossFit',   'High-intensity functional training','#ef4444'),
  ('Spin',       'Indoor cycling cardio classes',     '#f59e0b'),
  ('Pilates',    'Core strength and flexibility',     '#8b5cf6'),
  ('Zumba',      'Dance fitness and fun',             '#ec4899'),
  ('Boxing',     'Combat fitness training',           '#f97316')
ON CONFLICT DO NOTHING;

INSERT INTO public.system_settings (key, value) VALUES
  ('gym_name', '"Salon Raed"'),
  ('currency', '"USD"'),
  ('tax_rate', '0'),
  ('lbp_rate', '90000')
ON CONFLICT DO NOTHING;
