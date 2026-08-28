ALTER TABLE asakai_shipment
  ADD COLUMN source_sheet VARCHAR(32) NULL AFTER completed_shift,
  ADD KEY asakai_shipment_source_sheet_idx (source_sheet);

UPDATE asakai_shipment
SET source_sheet = CASE
  WHEN line = 'CB' AND UPPER(dest) LIKE 'TMC%' THEN 'CB TMC'
  WHEN line = 'CB' THEN 'CB STM'
  WHEN line = 'CH' AND UPPER(dest) LIKE 'TMC%' THEN 'CH TMC'
  WHEN line = 'CH' THEN 'CH STM'
  WHEN line = 'CR' AND UPPER(dest) LIKE 'TMC%' THEN 'CR TMC'
  WHEN line = 'CR' THEN 'CR STM'
  WHEN line = 'CAM' THEN 'CA STM'
  ELSE NULL
END
WHERE source_sheet IS NULL;
