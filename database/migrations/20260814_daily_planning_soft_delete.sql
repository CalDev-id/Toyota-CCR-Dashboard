ALTER TABLE t_daily_production_plan
  ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS deleted_by INT NULL,
  ADD INDEX IF NOT EXISTS daily_plan_deleted_idx (is_deleted),
  ADD INDEX IF NOT EXISTS daily_plan_deleted_by_idx (deleted_by);
