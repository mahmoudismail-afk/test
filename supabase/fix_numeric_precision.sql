-- Run this in Supabase SQL Editor to fix the precision of all money columns
-- Changes NUMERIC(10,2) → NUMERIC(10,4) so LBP amounts round-trip correctly

ALTER TABLE public.payments
  ALTER COLUMN amount TYPE NUMERIC(10,4);

ALTER TABLE public.membership_plans
  ALTER COLUMN price TYPE NUMERIC(10,4);

ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE NUMERIC(10,4);

ALTER TABLE public.inventory_items
  ALTER COLUMN cost_price TYPE NUMERIC(10,4),
  ALTER COLUMN sell_price TYPE NUMERIC(10,4);

ALTER TABLE public.inventory_transactions
  ALTER COLUMN unit_price  TYPE NUMERIC(10,4),
  ALTER COLUMN total_amount TYPE NUMERIC(10,4);
