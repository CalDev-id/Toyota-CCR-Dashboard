CREATE TABLE IF NOT EXISTS asakai_shipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  line VARCHAR(16) NOT NULL,
  dest VARCHAR(64) NOT NULL,
  module_no VARCHAR(191) NOT NULL,
  renban VARCHAR(191) NOT NULL,
  vanning_date DATE NOT NULL,
  etd_date DATE NULL,
  remark VARCHAR(64) NULL,
  completed_date VARCHAR(16) NULL,
  completed_prod_date DATE NULL,
  completed_shift VARCHAR(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY asakai_shipment_unique_row (line, dest, module_no, renban, vanning_date),
  KEY asakai_shipment_vanning_date_idx (vanning_date),
  KEY asakai_shipment_pending_idx (remark, vanning_date)
);
