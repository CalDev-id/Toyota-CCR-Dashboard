CREATE TABLE IF NOT EXISTS lsr_asakai_part_filters (
  line_key VARCHAR(4) NOT NULL,
  part_no VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_key, part_no)
);
