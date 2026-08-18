ALTER TABLE t_daily_ramadan_schedule
  MODIFY COLUMN day_regular_start TIME NOT NULL DEFAULT '07:20:00',
  MODIFY COLUMN day_friday_start TIME NOT NULL DEFAULT '07:20:00';

UPDATE t_daily_ramadan_schedule
SET day_regular_start = '07:20:00'
WHERE day_regular_start = '07:15:00';

UPDATE t_daily_ramadan_schedule
SET day_friday_start = '07:20:00'
WHERE day_friday_start = '07:15:00';
