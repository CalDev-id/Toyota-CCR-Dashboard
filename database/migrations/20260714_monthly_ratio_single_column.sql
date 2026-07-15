ALTER TABLE t_plan_daily_production_cylblock ADD COLUMN IF NOT EXISTS fratio VARCHAR(20) NULL;
ALTER TABLE t_plan_daily_production_cylhead ADD COLUMN IF NOT EXISTS fratio VARCHAR(20) NULL;
ALTER TABLE t_plan_daily_production_camshaft ADD COLUMN IF NOT EXISTS fratio VARCHAR(20) NULL;
ALTER TABLE t_plan_daily_production_crankshaft ADD COLUMN IF NOT EXISTS fratio VARCHAR(20) NULL;

UPDATE t_plan_daily_production_cylblock SET fratio = CONCAT(COALESCE(fratio_1tr, 1), ':', COALESCE(fratio_2tr, 1)) WHERE fratio IS NULL OR fratio = '';
UPDATE t_plan_daily_production_cylhead SET fratio = CONCAT(COALESCE(fratio_1tr, 1), ':', COALESCE(fratio_2tr, 1)) WHERE fratio IS NULL OR fratio = '';
UPDATE t_plan_daily_production_camshaft SET fratio = CONCAT(COALESCE(fratio_1tr, 1), ':', COALESCE(fratio_2tr, 1)) WHERE fratio IS NULL OR fratio = '';
UPDATE t_plan_daily_production_crankshaft SET fratio = CONCAT(COALESCE(fratio_1tr, 1), ':', COALESCE(fratio_2tr, 1)) WHERE fratio IS NULL OR fratio = '';

ALTER TABLE t_plan_daily_production_cylblock DROP COLUMN IF EXISTS ftotal_target, DROP COLUMN IF EXISTS fratio_1tr, DROP COLUMN IF EXISTS fratio_2tr;
ALTER TABLE t_plan_daily_production_cylhead DROP COLUMN IF EXISTS ftotal_target, DROP COLUMN IF EXISTS fratio_1tr, DROP COLUMN IF EXISTS fratio_2tr;
ALTER TABLE t_plan_daily_production_camshaft DROP COLUMN IF EXISTS ftotal_target, DROP COLUMN IF EXISTS fratio_1tr, DROP COLUMN IF EXISTS fratio_2tr;
ALTER TABLE t_plan_daily_production_crankshaft DROP COLUMN IF EXISTS ftotal_target, DROP COLUMN IF EXISTS fratio_1tr, DROP COLUMN IF EXISTS fratio_2tr;
