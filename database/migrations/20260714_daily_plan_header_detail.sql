CREATE TABLE IF NOT EXISTS t_daily_production_plan (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_key VARCHAR(32) NOT NULL,
  fdate DATE NOT NULL,
  fshift VARCHAR(16) NOT NULL,
  fgroup VARCHAR(16) NOT NULL,
  override_tt DECIMAL(8,3) NULL,
  override_ratio VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY daily_plan_unique (line_key, fdate, fshift, fgroup)
);

CREATE TABLE IF NOT EXISTS t_daily_production_plan_slot (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  daily_plan_id BIGINT NOT NULL,
  slot_order INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  prod_minutes INT NOT NULL,
  slot_type VARCHAR(16) NOT NULL,
  oee DECIMAL(5,2) NULL,
  is_oee_override TINYINT(1) NOT NULL DEFAULT 0,
  total_target INT NOT NULL DEFAULT 0,
  one_tr INT NOT NULL DEFAULT 0,
  two_tr INT NOT NULL DEFAULT 0,
  is_schedule_override TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY daily_plan_slot_unique (daily_plan_id, slot_order),
  CONSTRAINT fk_daily_plan_slot_plan FOREIGN KEY (daily_plan_id) REFERENCES t_daily_production_plan(id) ON DELETE CASCADE
);

INSERT IGNORE INTO t_daily_production_plan (line_key, fdate, fshift, fgroup, override_tt, override_ratio)
SELECT line_key, fdate, fshift, fgroup,
  CASE WHEN MAX(is_parameter_override) = 1 THEN MAX(ftt) ELSE NULL END,
  CASE WHEN MAX(is_parameter_override) = 1 THEN MAX(fratio) ELSE NULL END
FROM t_daily_production_planning_slot
GROUP BY line_key, fdate, fshift, fgroup;

INSERT IGNORE INTO t_daily_production_plan_slot (daily_plan_id, slot_order, start_time, end_time, prod_minutes, slot_type, oee, is_oee_override, total_target, one_tr, two_tr, is_schedule_override)
SELECT plan.id, legacy.slot_order, legacy.start_time, legacy.end_time, legacy.prod_minutes, legacy.slot_type,
  legacy.foee, legacy.is_oee_override, legacy.ftotal_target, legacy.f1tr, legacy.f2tr, legacy.is_manual_override
FROM t_daily_production_planning_slot legacy
INNER JOIN t_daily_production_plan plan ON plan.line_key = legacy.line_key AND plan.fdate = legacy.fdate AND plan.fshift = legacy.fshift AND plan.fgroup = legacy.fgroup;
