CREATE TABLE IF NOT EXISTS t_daily_production_plan_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  daily_plan_id BIGINT NOT NULL,
  slot_id BIGINT NULL,
  action VARCHAR(64) NOT NULL,
  details LONGTEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX daily_plan_history_plan_created_idx (daily_plan_id, created_at),
  INDEX daily_plan_history_slot_idx (slot_id),
  INDEX daily_plan_history_user_idx (created_by),
  CONSTRAINT fk_daily_plan_history_plan FOREIGN KEY (daily_plan_id) REFERENCES t_daily_production_plan(id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_plan_history_user FOREIGN KEY (created_by) REFERENCES `User`(id) ON DELETE SET NULL
);
