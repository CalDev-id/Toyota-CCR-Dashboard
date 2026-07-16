ALTER TABLE t_daily_production_planning_slot
  ADD COLUMN IF NOT EXISTS is_parameter_override TINYINT(1) NOT NULL DEFAULT 0;
