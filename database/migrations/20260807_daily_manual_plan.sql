ALTER TABLE t_daily_production_plan
  ADD COLUMN IF NOT EXISTS is_manual_plan TINYINT(1) NOT NULL DEFAULT 0;
