ALTER TABLE t_daily_production_plan_slot
  ADD COLUMN IF NOT EXISTS tt_override DECIMAL(8,3) NULL,
  ADD COLUMN IF NOT EXISTS ratio_override VARCHAR(20) NULL;
