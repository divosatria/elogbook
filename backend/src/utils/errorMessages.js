/**
 * Helper functions for user-friendly error messages
 */

const getUserFriendlyErrorMessage = (error, context = '') => {
  const message = error.message || error.toString();
  
  // Database connection errors
  if (message.includes('ECONNREFUSED') || message.includes('database')) {
    return 'Koneksi ke database bermasalah. Silakan coba lagi nanti.';
  }
  
  // Authentication errors
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Sesi Anda telah berakhir. Silakan login ulang.';
  }
  
  // Permission errors
  if (message.includes('forbidden') || message.includes('403')) {
    return 'Anda tidak memiliki akses untuk melakukan operasi ini.';
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return context ? `${context} tidak ditemukan.` : 'Data yang dicari tidak ditemukan.';
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Data yang dimasukkan tidak valid. Periksa kembali form Anda.';
  }
  
  // File upload errors
  if (message.includes('file') && message.includes('size')) {
    return 'Ukuran file terlalu besar. Maksimal 10MB.';
  }
  
  if (message.includes('file') && message.includes('type')) {
    return 'Format file tidak didukung. Gunakan JPG, PNG, atau PDF.';
  }
  
  // Document errors
  if (message.includes('dokumen')) {
    return 'Dokumen tidak lengkap atau tidak valid. Periksa semua dokumen yang diperlukan.';
  }
  
  // Trip status errors
  if (message.includes('trip') && message.includes('status')) {
    return 'Status trip tidak memungkinkan untuk operasi ini.';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return 'Koneksi internet bermasalah. Periksa koneksi Anda.';
  }
  
  // Server errors (5xx)
  if (message.includes('500') || message.includes('server error')) {
    return 'Server sedang bermasalah. Silakan coba lagi nanti.';
  }
  
  // Default fallback
  return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
};

const getValidationErrorMessage = (field, rule) => {
  const fieldNames = {
    kapalId: 'ID Kapal',
    nahkodaId: 'ID Nahkoda',
    tanggalBerangkat: 'Tanggal Berangkat',
    estimasiPulang: 'Estimasi Pulang',
    nomorSertifikat: 'Nomor Sertifikat',
    tanggalBerlaku: 'Tanggal Berlaku',
    jumlahLiter: 'Jumlah Liter',
    hargaPerLiter: 'Harga per Liter',
    totalHarga: 'Total Harga',
    jenisEs: 'Jenis Es',
    jumlahKg: 'Jumlah Kg'
  };
  
  const fieldName = fieldNames[field] || field;
  
  switch (rule) {
    case 'required':
      return `${fieldName} wajib diisi.`;
    case 'invalid':
      return `${fieldName} tidak valid.`;
    case 'min':
      return `${fieldName} terlalu kecil.`;
    case 'max':
      return `${fieldName} terlalu besar.`;
    case 'date':
      return `${fieldName} harus berupa tanggal yang valid.`;
    case 'number':
      return `${fieldName} harus berupa angka.`;
    case 'email':
      return `${fieldName} harus berupa email yang valid.`;
    default:
      return `${fieldName} tidak valid.`;
  }
};

module.exports = {
  getUserFriendlyErrorMessage,
  getValidationErrorMessage
};