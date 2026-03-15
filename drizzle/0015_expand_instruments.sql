-- Expand from 13 to 20 instruments: add AUDUSD, USDCAD, NZDUSD, USDCHF, BTCUSD, ETHUSD, USOIL

INSERT INTO instruments (code, name, category) VALUES
  ('AUDUSD', 'Australian Dollar / US Dollar', 'forex'),
  ('USDCAD', 'US Dollar / Canadian Dollar', 'forex'),
  ('NZDUSD', 'New Zealand Dollar / US Dollar', 'forex'),
  ('USDCHF', 'US Dollar / Swiss Franc', 'forex'),
  ('BTCUSD', 'Bitcoin / US Dollar', 'crypto'),
  ('ETHUSD', 'Ethereum / US Dollar', 'crypto'),
  ('USOIL', 'WTI Crude Oil', 'commodity')
ON CONFLICT (code) DO NOTHING;
