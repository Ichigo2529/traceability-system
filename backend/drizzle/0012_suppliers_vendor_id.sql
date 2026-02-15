ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS vendor_id varchar(10);

UPDATE suppliers
SET vendor_id = CASE UPPER(code)
  WHEN 'DP' THEN 'P'
  WHEN 'DUFU' THEN 'F'
  WHEN 'IPM' THEN 'P'
  WHEN 'DP-M(MPMT)' THEN 'F'
  WHEN 'INTRIPLEX' THEN 'I'
  WHEN 'CFTC' THEN 'C'
  WHEN 'RAYCO' THEN 'R'
  ELSE vendor_id
END
WHERE vendor_id IS NULL;
