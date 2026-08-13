ALTER TABLE t_daily_production_plan
  ADD COLUMN IF NOT EXISTS source_signature CHAR(64) NULL;
