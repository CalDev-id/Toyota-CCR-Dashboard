ALTER TABLE v_cylblock_summary ADD COLUMN IF NOT EXISTS actual_work_hours DOUBLE NULL;
ALTER TABLE v_cylhead_summary ADD COLUMN IF NOT EXISTS actual_work_hours DOUBLE NULL;
ALTER TABLE v_crankshaft_summary ADD COLUMN IF NOT EXISTS actual_work_hours DOUBLE NULL;
ALTER TABLE v_camshaft_summary ADD COLUMN IF NOT EXISTS actual_work_hours DOUBLE NULL;
ALTER TABLE v_assy_summary ADD COLUMN IF NOT EXISTS actual_work_hours DECIMAL(34,2) NULL;
