INSERT IGNORE INTO linestop_db (line_key, machine_name, normalized_name) VALUES
  ('cylblock', 'ISP 078', 'ISP078'),
  ('cylblock', 'IMI 037', 'IMI037'),
  ('cylblock', 'IDR 048', 'IDR048'),
  ('cylblock', 'IDR 066', 'IDR066'),
  ('cylblock', 'ISP 088', 'ISP088'),
  ('crankshaft', 'IMI 043', 'IMI043');

UPDATE linestop_db
SET machine_name = 'GRAFIR', normalized_name = 'GRAFIR'
WHERE line_key = 'crankshaft' AND machine_name = 'MC AUTO GRAFIR ERROR';

UPDATE linestop_db
SET machine_name = 'PRESS PIN', normalized_name = 'PRESSPIN'
WHERE line_key = 'camshaft' AND machine_name = 'PRESS PIN LEFT CLAMP FAULT';
