-- Monthly Planning is the master input. Daily Planning stores its own snapshots.
ALTER TABLE t_plan_daily_production_cylblock ADD COLUMN IF NOT EXISTS ftotal_target INT NULL, ADD COLUMN IF NOT EXISTS ftt DECIMAL(8,3) NULL, ADD COLUMN IF NOT EXISTS fratio_1tr INT NULL, ADD COLUMN IF NOT EXISTS fratio_2tr INT NULL;
ALTER TABLE t_plan_daily_production_cylhead ADD COLUMN IF NOT EXISTS ftotal_target INT NULL, ADD COLUMN IF NOT EXISTS ftt DECIMAL(8,3) NULL, ADD COLUMN IF NOT EXISTS fratio_1tr INT NULL, ADD COLUMN IF NOT EXISTS fratio_2tr INT NULL;
ALTER TABLE t_plan_daily_production_camshaft ADD COLUMN IF NOT EXISTS ftotal_target INT NULL, ADD COLUMN IF NOT EXISTS ftt DECIMAL(8,3) NULL, ADD COLUMN IF NOT EXISTS fratio_1tr INT NULL, ADD COLUMN IF NOT EXISTS fratio_2tr INT NULL;
ALTER TABLE t_plan_daily_production_crankshaft ADD COLUMN IF NOT EXISTS ftotal_target INT NULL, ADD COLUMN IF NOT EXISTS ftt DECIMAL(8,3) NULL, ADD COLUMN IF NOT EXISTS fratio_1tr INT NULL, ADD COLUMN IF NOT EXISTS fratio_2tr INT NULL;

CREATE TABLE IF NOT EXISTS t_daily_production_planning_slot (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_key VARCHAR(32) NOT NULL,
  fdate DATE NOT NULL,
  fshift VARCHAR(16) NOT NULL,
  fgroup VARCHAR(16) NOT NULL,
  slot_order INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  prod_minutes INT NOT NULL,
  slot_type VARCHAR(16) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  ftotal_target INT NOT NULL DEFAULT 0,
  f1tr INT NOT NULL DEFAULT 0,
  f2tr INT NOT NULL DEFAULT 0,
  is_manual_override TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY daily_planning_slot_unique (line_key, fdate, fshift, fgroup, slot_order)
);
