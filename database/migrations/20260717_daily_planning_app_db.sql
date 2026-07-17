CREATE TABLE IF NOT EXISTS t_daily_production_plan (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_key VARCHAR(32) NOT NULL,
  fdate DATE NOT NULL,
  fshift VARCHAR(16) NOT NULL,
  fgroup VARCHAR(16) NOT NULL,
  override_tt DECIMAL(8,3) NULL,
  override_ratio VARCHAR(20) NULL,
  source_tt DECIMAL(8,3) NULL,
  source_oee DECIMAL(5,2) NULL,
  source_ratio VARCHAR(20) NULL,
  source_ot_minutes INT NULL,
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
