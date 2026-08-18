CREATE TABLE IF NOT EXISTS t_daily_ramadan_schedule (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  day_regular_start TIME NOT NULL DEFAULT '07:20:00',
  day_regular_end TIME NOT NULL DEFAULT '15:50:00',
  day_regular_break_start TIME NOT NULL DEFAULT '12:00:00',
  day_regular_break_end TIME NOT NULL DEFAULT '12:35:00',
  day_friday_start TIME NOT NULL DEFAULT '07:20:00',
  day_friday_end TIME NOT NULL DEFAULT '16:15:00',
  day_friday_break_start TIME NOT NULL DEFAULT '12:00:00',
  day_friday_break_end TIME NOT NULL DEFAULT '13:00:00',
  night_start TIME NOT NULL DEFAULT '20:30:00',
  night_end TIME NOT NULL DEFAULT '05:50:00',
  night_break_one_start TIME NOT NULL DEFAULT '00:00:00',
  night_break_one_end TIME NOT NULL DEFAULT '00:20:00',
  night_break_two_start TIME NOT NULL DEFAULT '04:00:00',
  night_break_two_end TIME NOT NULL DEFAULT '05:00:00',
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_ramadan_schedule_user FOREIGN KEY (updated_by) REFERENCES `User`(id) ON DELETE SET NULL
);

INSERT IGNORE INTO t_daily_ramadan_schedule (id) VALUES (1);
