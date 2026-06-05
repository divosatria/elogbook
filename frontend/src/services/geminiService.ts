// Simple mock service untuk mengganti Gemini AI
export const getMaritimeBulletin = async (weatherData: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { waveHeight, windSpeed } = weatherData;
  
  let status = 'Safe';
  let summary = 'Kondisi laut aman untuk pelayaran';
  let advice = 'Lanjutkan aktivitas normal';
  
  if (waveHeight > 3 || windSpeed > 25) {
    status = 'Danger';
    summary = 'Kondisi laut berbahaya, gelombang tinggi dan angin kencang';
    advice = 'Hindari pelayaran, kembali ke pelabuhan terdekat';
  } else if (waveHeight > 2 || windSpeed > 15) {
    status = 'Warning';
    summary = 'Kondisi laut perlu diwaspadai';
    advice = 'Berhati-hati saat berlayar, pantau cuaca terus';
  }
  
  return { status, summary, advice };
};

export const analyzeSafetyRisk = async (tripData: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const risks = ['Cuaca buruk', 'Gelombang tinggi'];
  const riskLevel = Math.random() > 0.7 ? 'High' : 'Low';
  
  return { risks, riskLevel };
};

/**
 * Menghasilkan rekomendasi penangkapan berdasarkan cuaca maritim dan riwayat hasil tangkapan H-1.
 * @param weatherData Data cuaca (diambil dari OpenWeatherMap/Maritime endpoint)
 * @param yesterdayCatchKg Total catch yesterday (H-1) dalam Kilogram
 */
export const getFishingRecommendation = async (weatherData: any, yesterdayCatchKg: number) => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // Simulasi pemrosesan

  // Mengambil kecepatan angin sebagai indikator keamanan (dalam m/s)
  const windSpeed = weatherData?.wind_speed_ms || 0;
  // Deskripsi cuaca
  const condition = weatherData?.condition || '';
  const badWeatherConditions = ['Rain', 'Thunderstorm', 'Snow'];
  const isBadWeather = badWeatherConditions.includes(condition) || windSpeed > 10;
  
  // Ambang batas (dummy logic)
  const IS_HIGH_CATCH = yesterdayCatchKg >= 500; // Contoh: > 500 kg dianggap tinggi
  const IS_LOW_CATCH = yesterdayCatchKg < 100 && yesterdayCatchKg > 0;

  let recommendationLevel = 'NORMAL';
  let summary = 'Kawasan ini memiliki potensi tangkapan standar dengan cuaca mendukung.';
  let score = 70;
  const reasons: string[] = [];

  // Logika Cuaca (Prioritas Utama: Keselamatan)
  if (isBadWeather) {
    recommendationLevel = 'BAHAYA';
    summary = 'Kondisi cuaca sangat buruk. Tidak direkomendasikan melakukan penangkapan di area ini terlepas dari potensi tangkapan H-1.';
    score = 20;
    reasons.push('Angin kencang atau cuaca buruk');
  } else if (windSpeed > 7) {
    recommendationLevel = 'WASPADA';
    summary = 'Cuaca cukup berangin. Direkomendasikan berhati-hati, namun potensi tangkapan bergantung pada riwayat.';
    score = 50;
    reasons.push('Kecepatan angin cukup tinggi');
  } else {
    reasons.push('Cuaca cerah dan aman untuk berlayar');
  }

  // Logika Tangkapan (JIKA CUACA AMAN/WASPADA)
  if (!isBadWeather) {
    if (IS_HIGH_CATCH) {
      if (recommendationLevel === 'NORMAL') {
        recommendationLevel = 'SANGAT DISARANKAN';
        score = 95;
      } else {
        score += 20; // tambah score jika waspada
      }
      summary = 'Hasil tangkapan kemarin sangat tinggi di area ini. Ditambah kondisi cuaca yang mendukung, tempat ini menjadi lokasi utama yang direkomendasikan.';
      reasons.push(`Histori tangkapan kemarin luar biasa tinggi (${yesterdayCatchKg.toLocaleString('id-ID')} Kg)`);
    } else if (IS_LOW_CATCH) {
      if (recommendationLevel === 'NORMAL') {
        recommendationLevel = 'KURANG DISARANKAN';
        summary = 'Meskipun cuaca cerah, hasil tangkapan di area ini kemarin sangat rendah.';
        score = 40;
      }
      reasons.push(`Tangkapan kemarin di bawah rata-rata (${yesterdayCatchKg.toLocaleString('id-ID')} Kg)`);
    } else if (yesterdayCatchKg === 0) {
      reasons.push('Tidak ada data tangkapan kemarin untuk area ini.');
    } else {
      reasons.push(`Tangkapan kemarin standar (${yesterdayCatchKg.toLocaleString('id-ID')} Kg)`);
    }
  }

  return {
    level: recommendationLevel,
    score,
    summary,
    reasons
  };
};