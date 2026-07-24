ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN', 'CCR', 'CCR_OPERATION', 'CCR_GROUP_LEADER', 'USER') NOT NULL DEFAULT 'ADMIN';

UPDATE `User` SET `role` = 'CCR_OPERATION' WHERE `role` = 'CCR';

ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN', 'CCR_OPERATION', 'CCR_GROUP_LEADER', 'USER') NOT NULL DEFAULT 'ADMIN';

CREATE TABLE IF NOT EXISTS production_line_stop_decision (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_key VARCHAR(32) NOT NULL,
  report_date DATE NOT NULL,
  shift VARCHAR(16) NOT NULL,
  source_last_updated_at DATETIME(3) NOT NULL,
  alert_started_at DATETIME(3) NOT NULL,
  decision ENUM('RUNNING', 'LINE_STOP', 'CHOKOTEI') NOT NULL,
  decided_by_user_id INT NOT NULL,
  decided_by_name VARCHAR(191) NOT NULL,
  decided_at DATETIME(3) NOT NULL,
  UNIQUE KEY production_line_stop_decision_unique (line_key, report_date, shift, source_last_updated_at, alert_started_at),
  KEY production_line_stop_decision_lookup (line_key, report_date, shift, source_last_updated_at, decided_at)
);
