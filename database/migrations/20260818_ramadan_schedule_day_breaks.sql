ALTER TABLE t_daily_ramadan_schedule
  ADD COLUMN IF NOT EXISTS day_regular_break_one_start TIME NOT NULL DEFAULT '09:30:00' AFTER day_regular_end,
  ADD COLUMN IF NOT EXISTS day_regular_break_one_end TIME NOT NULL DEFAULT '09:40:00' AFTER day_regular_break_one_start,
  ADD COLUMN IF NOT EXISTS day_regular_break_two_start TIME NOT NULL DEFAULT '14:00:00' AFTER day_regular_break_end,
  ADD COLUMN IF NOT EXISTS day_regular_break_two_end TIME NOT NULL DEFAULT '14:10:00' AFTER day_regular_break_two_start,
  ADD COLUMN IF NOT EXISTS day_friday_break_one_start TIME NOT NULL DEFAULT '09:30:00' AFTER day_friday_end,
  ADD COLUMN IF NOT EXISTS day_friday_break_one_end TIME NOT NULL DEFAULT '09:40:00' AFTER day_friday_break_one_start,
  ADD COLUMN IF NOT EXISTS day_friday_break_two_start TIME NOT NULL DEFAULT '14:30:00' AFTER day_friday_break_end,
  ADD COLUMN IF NOT EXISTS day_friday_break_two_end TIME NOT NULL DEFAULT '14:40:00' AFTER day_friday_break_two_start;
