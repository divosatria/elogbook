export enum SafetyLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION', 
  DANGER = 'DANGER'
}

export interface User {
  id: number;
  _id?: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'supervisor' | 'nahkoda' | 'abk' | 'nelayan';
  profile: {
    nama: string;
    telepon: string;
    alamat: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  foto?: string;
  fotoUrl?: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  waveHeight: number;
  visibility: number;
  condition: string;
  safetyLevel: 'SAFE' | 'CAUTION' | 'DANGER';
}

export interface KategoriKapal {
  kode: 'kecil' | 'menengah_kecil' | 'menengah' | 'besar';
  label: string;
  range: string;
}

export interface Vessel {
  id: number;
  vesselId?: string;
  namaKapal: string;
  nomorRegistrasi: string;
  nomorKapal?: string;
  pemilik: string;
  tipeKapal: 'penangkap_ikan' | 'pengangkut_ikan' | 'penelitian' | 'patroli';
  alatTangkap?: string;
  panjangKapal?: number;
  lebarKapal?: number;
  tinggiKapal?: number;
  beratKapal?: number;
  netTonnage?: number;
  kategoriKapal?: KategoriKapal;
  statusOperasional: 'active' | 'maintenance' | 'inactive';
  statusPelayaran: 'sailing' | 'docked' | 'maintenance' | 'idle';
  nahkodaId?: number;
  nahkoda?: VesselCrew;
  gpsDeviceId?: number;
  gpsDevice?: {
    id: number;
    namaPerangkat: string;
    merk?: string;
    model?: string;
    statusOperasional: string;
  };
  abk?: VesselCrew[];
  perangkats?: Perangkat[];
  spesifikasi?: VesselSpecification;
  foto?: string;
  mesin?: VesselEngine;
  gps?: VesselGPS;
  dokumen?: VesselDocument[];
  sertifikatJalan?: VesselCertificate;
  dataBahanBakar?: VesselFuel;
  asuransi?: VesselInsurance;
  pelabuhanAsal?: string;
  pelabuhanAsalId?: number;
  pelabuhanAsalZone?: {
    id: number;
    name: string;
    type: string;
    coordinates: any;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Perangkat {
  id: number;
  namaPerangkat: string;
  jenisPerangkat: 'gps' | 'radio' | 'sonar' | 'radar' | 'kompas' | 'mesin' | 'alat_tangkap' | 'keselamatan' | 'lainnya';
  merk?: string;
  model?: string;
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'tidak_berfungsi';
  statusOperasional: 'aktif' | 'maintenance' | 'rusak' | 'tidak_digunakan';
  kapalId?: number;
}

export interface VesselCrew {
  id: number;
  username: string;
  nama: string;
  role: 'nahkoda' | 'abk' | 'nelayan';
}

export interface VesselSpecification {
  kapasitas?: number;
  kapasitasBensin?: number;
  kapasitasEs?: number;
  kapasitasMuatan?: number;
  jumlahABK?: number;
}

export interface VesselEngine {
  merk?: string;
  daya?: string;
  tahun?: string;
}

export interface VesselGPS {
  merk?: string;
  tipe?: string;
  status?: 'aktif' | 'rusak' | 'tidak_ada';
  currentPosition?: GPSLocation;
  locations?: GPSLocation[];
  isActive?: boolean;
  lastUpdate?: string;
}

export interface VesselDocument {
  nama: string;
  file: string;
}

export interface VesselCertificate {
  nomor?: string;
  berlaku?: string;
  file?: string;
}

export interface VesselFuel {
  kapasitas?: number;
  jenis?: 'solar' | 'bensin' | 'pertamax';
  konsumsi?: number;
}

export interface VesselInsurance {
  perusahaan?: string;
  nomor?: string;
  berlaku?: string;
  file?: string;
}

export interface GPSData {
  currentPosition?: GPSLocation;
  locations: GPSLocation[];
  isActive: boolean;
  lastUpdate: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  accuracy: 'high' | 'medium' | 'low';
}

export interface Trip {
  id: string;
  kapalId: number;
  nahkodaId: number;
  tanggalBerangkat: string;
  estimasiPulang: string;
  durasi: number;
  areaTangkap: CatchArea;
  status: TripStatus;
  perizinan: TripPermission;
  kapal?: Vessel;
  nahkoda?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CatchArea {
  nama: string;
  zona: string;
  koordinat?: {
    latitude: number;
    longitude: number;
  };
}

export type TripStatus = 
  | 'menunggu_izin' 
  | 'disetujui' 
  | 'sedang_melaut' 
  | 'selesai' 
  | 'ditolak';

export interface TripPermission {
  dokumen: {
    izinMelaut: boolean;
    dokumenKapal: boolean;
    asuransi: boolean;
  };
  operasional: {
    bensinTersedia: number;
    esTersedia: number;
  };
  catatan?: string;
  alasanDitolak?: string;
  disetujuiOleh?: number;
  tanggalDisetujui?: string;
}

export interface CatchPolygon {
  id: number;
  name: string;
  description: string;
  coordinates: Array<{lat: number; lng: number}>;
  zoneType: 'fishing' | 'restricted' | 'conservation' | 'special';
  fishTypes: string[];
  maxVessels?: number;
  isActive: boolean;
  color: string;
  createdBy: number;
  createdAt: string;
}

export interface HarborPOI {
  id: number;
  name: string;
  type: 'harbor_office' | 'shipping_office' | 'customs' | 'fuel_station' | 'repair_dock' | 'warehouse' | 'lighthouse' | 'pilot_station';
  coordinates: {lat: number; lng: number};
  description?: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  operatingHours?: string;
  services?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface EmergencyAlert {
  id: string;
  vesselId: number;
  jenisEmergency: 'SOS' | 'MEDICAL' | 'MECHANICAL' | 'WEATHER';
  deskripsi: string;
  lokasi: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'resolved' | 'false_alarm';
  waktuKejadian: string;
  vessel?: Vessel;
  createdAt: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}