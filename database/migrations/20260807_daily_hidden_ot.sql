ALTER TABLE t_daily_production_plan_slot
  ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) NOT NULL DEFAULT 0;
