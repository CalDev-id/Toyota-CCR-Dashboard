ALTER TABLE t_plan_daily_production_cylblock ADD COLUMN IF NOT EXISTS foee DECIMAL(5,2) NULL;
ALTER TABLE t_plan_daily_production_cylhead ADD COLUMN IF NOT EXISTS foee DECIMAL(5,2) NULL;
ALTER TABLE t_plan_daily_production_camshaft ADD COLUMN IF NOT EXISTS foee DECIMAL(5,2) NULL;
ALTER TABLE t_plan_daily_production_crankshaft ADD COLUMN IF NOT EXISTS foee DECIMAL(5,2) NULL;

ALTER TABLE t_daily_production_planning_slot
  ADD COLUMN IF NOT EXISTS is_oee_override TINYINT(1) NOT NULL DEFAULT 0;
