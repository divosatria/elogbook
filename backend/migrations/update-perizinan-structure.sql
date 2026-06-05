-- Update existing trips to have proper perizinan structure
UPDATE trips 
SET perizinan = JSON_OBJECT(
  'dokumen', JSON_OBJECT(
    'izinMelaut', false,
    'dokumenKapal', false,
    'asuransi', false
  ),
  'operasional', JSON_OBJECT(
    'kapasitasBensin', 1000,
    'bensinTersedia', 0,
    'kapasitasEs', 500,
    'esTersedia', 0
  ),
  'catatan', null,
  'alasanDitolak', null
)
WHERE perizinan IS NULL OR JSON_TYPE(perizinan) = 'NULL';