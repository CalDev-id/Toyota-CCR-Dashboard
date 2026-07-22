CREATE TABLE IF NOT EXISTS production_realtime_status (
  line_key VARCHAR(32) NOT NULL,
  report_date DATE NOT NULL,
  shift VARCHAR(16) NOT NULL,
  last_changed_at DATETIME(3) NOT NULL,
  checked_at DATETIME(3) NOT NULL,
  source_signature CHAR(64) NOT NULL,
  PRIMARY KEY (line_key, report_date, shift)
);
