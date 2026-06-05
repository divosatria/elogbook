// Konfigurasi kebutuhan berdasarkan tipe kapal
export const VESSEL_TYPE_REQUIREMENTS = {
  penangkap_ikan: {
    name: 'Kapal Penangkap Ikan',
    minBensinPercentage: 90, // 90% kapasitas
    minEsPercentage: 80,     // 80% kapasitas
    requiredDocuments: ['izinMelaut', 'dokumenKapal', 'asuransi', 'sipi'],
    requiredSafety: ['pelampung', 'radioVHF', 'alatPemadam'],
    minCrewSize: 3,
    maxTripDuration: 14 // hari
  },
  pengangkut_ikan: {
    name: 'Kapal Pengangkut Ikan',
    minBensinPercentage: 85,
    minEsPercentage: 90,
    requiredDocuments: ['izinMelaut', 'dokumenKapal', 'asuransi', 'siup'],
    requiredSafety: ['pelampung', 'radioVHF', 'sekociPenyelamat'],
    minCrewSize: 2,
    maxTripDuration: 7
  },
  penelitian: {
    name: 'Kapal Penelitian',
    minBensinPercentage: 95,
    minEsPercentage: 50,
    requiredDocuments: ['izinMelaut', 'dokumenKapal', 'asuransi', 'izinPenelitian'],
    requiredSafety: ['pelampung', 'radioVHF', 'sekociPenyelamat', 'alatPemadam'],
    minCrewSize: 4,
    maxTripDuration: 30
  },
  patroli: {
    name: 'Kapal Patroli',
    minBensinPercentage: 100,
    minEsPercentage: 30,
    requiredDocuments: ['izinMelaut', 'dokumenKapal', 'asuransi', 'izinPatroli'],
    requiredSafety: ['pelampung', 'radioVHF', 'sekociPenyelamat', 'alatPemadam'],
    minCrewSize: 3,
    maxTripDuration: 5
  }
};

export const getVesselRequirements = (vesselType: string) => {
  return VESSEL_TYPE_REQUIREMENTS[vesselType as keyof typeof VESSEL_TYPE_REQUIREMENTS] || VESSEL_TYPE_REQUIREMENTS.penangkap_ikan;
};

export const validateTripRequirements = (trip: any, vessel: any) => {
  const requirements = getVesselRequirements(vessel.tipeKapal);
  const issues = [];

  // Cek bensin
  const bensinPercentage = (trip.perizinan?.operasional?.bensinTersedia / vessel.spesifikasi?.kapasitasBensin) * 100;
  if (bensinPercentage < requirements.minBensinPercentage) {
    issues.push(`Bensin kurang dari ${requirements.minBensinPercentage}% (${bensinPercentage.toFixed(1)}%)`);
  }

  // Cek es
  const esPercentage = (trip.perizinan?.operasional?.esTersedia / vessel.spesifikasi?.kapasitasEs) * 100;
  if (esPercentage < requirements.minEsPercentage) {
    issues.push(`Es kurang dari ${requirements.minEsPercentage}% (${esPercentage.toFixed(1)}%)`);
  }

  // Cek durasi trip
  if (trip.durasi > requirements.maxTripDuration) {
    issues.push(`Durasi trip melebihi batas ${requirements.maxTripDuration} hari`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    requirements
  };
};