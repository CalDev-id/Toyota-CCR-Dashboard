ALTER TABLE production_line_stop_decision
  MODIFY decision ENUM('RUNNING', 'LINE_STOP', 'CHOKOTEI', 'NO_PRODUCTION') NOT NULL;

ALTER TABLE production_line_stop_decision
  MODIFY decided_by_user_id INT NULL;
