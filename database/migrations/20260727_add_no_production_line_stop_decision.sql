ALTER TABLE production_line_stop_decision
  MODIFY decision ENUM('RUNNING', 'LINE_STOP', 'CHOKOTEI', 'NO_PRODUCTION') NOT NULL;
