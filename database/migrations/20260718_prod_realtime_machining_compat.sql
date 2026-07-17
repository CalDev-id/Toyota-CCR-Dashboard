ALTER TABLE v_cylblock_summary ADD COLUMN IF NOT EXISTS Prod_realtime DECIMAL(18,3) NULL;
ALTER TABLE v_cylhead_summary ADD COLUMN IF NOT EXISTS Prod_realtime DECIMAL(18,3) NULL;
ALTER TABLE v_camshaft_summary ADD COLUMN IF NOT EXISTS Prod_realtime DECIMAL(18,3) NULL;
ALTER TABLE v_crankshaft_summary ADD COLUMN IF NOT EXISTS Prod_realtime DECIMAL(18,3) NULL;

UPDATE v_cylblock_summary SET Prod_realtime = Prod_act WHERE Prod_realtime IS NULL;
UPDATE v_cylhead_summary SET Prod_realtime = Prod_act WHERE Prod_realtime IS NULL;
UPDATE v_camshaft_summary SET Prod_realtime = Prod_act WHERE Prod_realtime IS NULL;
UPDATE v_crankshaft_summary SET Prod_realtime = Prod_act WHERE Prod_realtime IS NULL;
