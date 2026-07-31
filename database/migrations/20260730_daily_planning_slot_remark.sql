ALTER TABLE t_daily_production_plan_slot
  ADD COLUMN IF NOT EXISTS remark VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS remark_updated_by INT NULL,
  ADD COLUMN IF NOT EXISTS remark_updated_at DATETIME NULL,
  ADD INDEX IF NOT EXISTS daily_plan_slot_remark_user_idx (remark_updated_by);
