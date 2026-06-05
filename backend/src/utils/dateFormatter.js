exports.formatTanggalIndonesia = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
};

exports.formatTanggalSurat = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
};