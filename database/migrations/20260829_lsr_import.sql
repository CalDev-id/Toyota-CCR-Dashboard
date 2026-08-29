CREATE TABLE IF NOT EXISTS lsr_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  shift VARCHAR(32) NOT NULL,
  shift2 VARCHAR(32) NOT NULL,
  shop VARCHAR(128) NOT NULL,
  part_no VARCHAR(191) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  part_name VARCHAR(191) NOT NULL,
  qty DECIMAL(18,4) NOT NULL,
  price_per_unit DECIMAL(18,4) NOT NULL,
  total_price DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY lsr_records_unique_row (`date`, shift, shift2, shop, part_no, reason),
  KEY lsr_records_date_idx (`date`)
);

CREATE TABLE IF NOT EXISTS lsr_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  shop VARCHAR(128) NOT NULL,
  target_daily DECIMAL(18,5) NULL,
  target_cumm DECIMAL(18,5) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY lsr_targets_unique_row (`date`, shop),
  KEY lsr_targets_date_idx (`date`)
);
