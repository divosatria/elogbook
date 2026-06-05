import React, { useState, useEffect } from "react";
import {
  Ship,
  Users,
  Plus,
  Edit,
  Trash2,
  Crown,
  Anchor,
  Camera,
  Navigation,
  Wrench,
  Pause,
  Eye,
  Search,
  Filter,
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  Activity,
  X,
  Tag,
  Fish,
  Scale,
} from "lucide-react";

import { Vessel, VesselCrew, KategoriKapal } from "../types";
import { API_ENDPOINTS } from "../config/urls";

// ============================================================
// Kategori Kapal & Alat Tangkap (Regulasi KKP)
// Referensi: Permen KP No. 71 Tahun 2016
// ============================================================
const KATEGORI_KAPAL = [
  { kode: 'kecil',          label: 'Nelayan Kecil (Tradisional)', range: '< 5 GT',     color: 'emerald', minGT: 0,   maxGT: 4.99      },
  { kode: 'menengah_kecil', label: 'Nelayan Menengah Kecil',      range: '5 – 10 GT',  color: 'blue',    minGT: 5,   maxGT: 10        },
  { kode: 'menengah',       label: 'Nelayan Menengah',            range: '10 – 30 GT', color: 'violet',  minGT: 10,  maxGT: 30        },
  { kode: 'besar',          label: 'Nelayan Besar / Industri',    range: '> 30 GT',    color: 'rose',    minGT: 30,  maxGT: Infinity  },
];

const ALAT_TANGKAP_BY_KATEGORI: Record<string, string[]> = {
  kecil: [
    'Pancing Ulur', 'Jaring Insang Tetap', 'Bubu', 'Sero',
    'Jala Tebar', 'Tombak / Panah', 'Perangkap Ikan',
  ],
  menengah_kecil: [
    'Jaring Insang Hanyut', 'Jaring Insang Tetap', 'Pancing Rawai Dasar',
    'Bubu', 'Bagan Perahu', 'Pancing Ulur', 'Jaring Lingkar Kecil',
  ],
  menengah: [
    'Pukat Cincin Kecil', 'Jaring Insang Hanyut', 'Pancing Rawai Tuna',
    'Bagan Perahu', 'Jaring Angkat', 'Pukat Udang', 'Pancing Tonda',
  ],
  besar: [
    'Pukat Cincin (Purse Seine)', 'Pukat Hela (Trawl)', 'Rawai Tuna (Long Line)',
    'Jaring Insang Pelagis', 'Pukat Udang', 'Pancing Tonda Industri',
    'Jaring Angkat Mekanis',
  ],
};

const BADGE_COLOR: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  violet:  'bg-violet-100 text-violet-700 border-violet-200',
  rose:    'bg-rose-100 text-rose-700 border-rose-200',
};

const getKategoriKapal = (gt: number | string | undefined | null) => {
  const gtNum = parseFloat(String(gt));
  if (!gt || isNaN(gtNum)) return null;
  return KATEGORI_KAPAL.find(k => gtNum >= k.minGT && gtNum <= k.maxGT) || null;
};

const getAlatTangkapOptions = (gt: number | string | undefined | null): string[] => {
  const kategori = getKategoriKapal(gt);
  if (!kategori) return Object.values(ALAT_TANGKAP_BY_KATEGORI).flat();
  return ALAT_TANGKAP_BY_KATEGORI[kategori.kode] || [];
};

interface DataKapalProps {
  onBack?: () => void;
}

const DataKapal: React.FC<DataKapalProps> = ({ onBack }) => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [crewMembers, setCrewMembers] = useState<VesselCrew[]>([]);
  const [gpsDevices, setGpsDevices] = useState<any[]>([]);
  const [harborZones, setHarborZones] = useState<{id: number; name: string; type: string; is_active: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [viewingVessel, setViewingVessel] = useState<Vessel | null>(null);
  const [vesselCatches, setVesselCatches] = useState<any[]>([]);
  const [loadingCatches, setLoadingCatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    vesselId: "",
    namaKapal: "",
    nomorRegistrasi: "",
    nomorKapal: "",
    pemilik: "",
    tipeKapal: "penangkap_ikan" as
      | "penangkap_ikan"
      | "pengangkut_ikan"
      | "penelitian"
      | "patroli",
    alatTangkap: "Jaring",
    panjangKapal: "" as number | string,
    lebarKapal: "" as number | string,
    tinggiKapal: "" as number | string,
    beratKapal: "" as number | string,
    netTonnage: "" as number | string,
    spesifikasi: { kapasitas: "" as number | string, panjangJaring: "" as number | string, lebarMataJaring: "" as number | string, jumlahJaring: "" as number | string },
    foto: "",
    statusPelayaran: "docked" as "docked" | "sailing" | "maintenance" | "idle",
    nahkodaId: null as number | null,
    abkIds: [] as number[],
    gpsDeviceId: null as number | null,
    mesin: { merk: "", daya: "", tahun: "" },
    gps: { merk: "", tipe: "", status: "aktif" as const },
    sertifikatJalan: { nomor: "", berlaku: "" },
    dataBahanBakar: { kapasitas: 0, jenis: "solar" as const, konsumsi: 0 },
    asuransi: { perusahaan: "", nomor: "", berlaku: "" },
    pelabuhanAsal: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchVessels(), fetchCrewMembers(), fetchGpsDevices(), fetchHarborZones()]);
    setLoading(false);
  };

  const fetchHarborZones = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.HARBOR_ZONES.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const zones = (data.data || []).filter((z: any) => z.is_active);
        setHarborZones(zones);
      }
    } catch (error) {
      console.error("Error fetching harbor zones:", error);
    }
  };

  const fetchVessels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.VESSELS.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVessels(data || []);
      }
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  };

  const fetchCrewMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.USERS.BY_ROLE("nahkoda,abk"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const crewData = data.data || data || [];
        setCrewMembers(
          crewData.filter((user: any) =>
            ["nahkoda", "abk"].includes(user.role),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching crew:", error);
    }
  };

  const fetchVesselCatches = async (kapalId: number) => {
    setLoadingCatches(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_ENDPOINTS.CATCH.LIST}?kapalId=${kapalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVesselCatches(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching vessel catches:", error);
      setVesselCatches([]);
    } finally {
      setLoadingCatches(false);
    }
  };

  const fetchGpsDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.VESSELS.GPS_DEVICES, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 [GPS DEBUG] Fetched GPS devices:", data);

        // Handle different response structures
        let gpsDevicesData = [];
        if (data.success && data.data) {
          gpsDevicesData = data.data;
        } else if (Array.isArray(data)) {
          gpsDevicesData = data;
        } else if (data.data) {
          gpsDevicesData = data.data;
        }

        console.log("🔍 [GPS DEBUG] Processed GPS devices:", gpsDevicesData);
        setGpsDevices(gpsDevicesData);
      } else {
        console.error(
          "❌ [GPS DEBUG] Failed to fetch GPS devices:",
          response.status,
        );
        // Set empty array if fetch fails
        setGpsDevices([]);
      }
    } catch (error) {
      console.error("❌ [GPS DEBUG] Error fetching GPS devices:", error);
      // Set empty array if error occurs
      setGpsDevices([]);
    }
  };

  const getAvailableCrew = (
    role: "nahkoda" | "abk",
    excludeVesselId?: number,
  ) => {
    // 1. Force IDs to be numbers for comparison
    const activeCrewIds = new Set(
      vessels
        .filter((v) => v.id !== excludeVesselId)
        .flatMap((v) => {
          const ids: number[] = [];
          if (v.nahkodaId) ids.push(Number(v.nahkodaId));
          if (v.abk && v.abk.length > 0)
            ids.push(...v.abk.map((a) => Number(a.id)));
          return ids;
        })
        .filter((id) => id > 0),
    );

    return crewMembers.filter((c) => {
      const crewId = Number(c.id);

      // Basic checks
      if (c.role !== role) return false;
      if (activeCrewIds.has(crewId)) return false;

      // Cross-check current form state
      // Nahkoda candidate cannot be currently selected as ABK
      if (role === "nahkoda") {
        const currentAbks = (formData.abkIds || []).map((id) => Number(id));
        return !currentAbks.includes(crewId);
      }

      // ABK candidate cannot be currently selected as Nahkoda
      if (role === "abk") {
        const currentNahkoda = Number(formData.nahkodaId);
        return crewId !== currentNahkoda;
      }

      return true;
    });
  };

  const handleAbkToggle = (abkId: number, isChecked: boolean) => {
    setFormData((prev) => {
      const currentAbkIds = (prev.abkIds || []).map((id) => Number(id));
      const idToToggle = Number(abkId);

      let newAbkIds;
      if (isChecked) {
        // Add unique using Set
        newAbkIds = Array.from(new Set([...currentAbkIds, idToToggle]));
      } else {
        // Remove
        newAbkIds = currentAbkIds.filter((id) => id !== idToToggle);
      }

      return { ...prev, abkIds: newAbkIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const vesselData = {
        vesselId: formData.vesselId,
        namaKapal: formData.namaKapal,
        nomorRegistrasi: formData.nomorRegistrasi,
        nomorKapal: formData.nomorKapal,
        pemilik: formData.pemilik,
        tipeKapal: formData.tipeKapal,
        alatTangkap: formData.alatTangkap,
        panjangKapal: formData.panjangKapal !== "" ? Number(formData.panjangKapal) : null,
        lebarKapal: formData.lebarKapal !== "" ? Number(formData.lebarKapal) : null,
        tinggiKapal: formData.tinggiKapal !== "" ? Number(formData.tinggiKapal) : null,
        beratKapal: formData.beratKapal !== "" ? Number(formData.beratKapal) : null,
        netTonnage: formData.netTonnage !== "" ? Number(formData.netTonnage) : null,
        spesifikasi: {
          ...formData.spesifikasi,
          kapasitas: Number(formData.spesifikasi.kapasitas),
        },
        foto: formData.foto,
        statusOperasional: "active",
        statusPelayaran: formData.statusPelayaran,
        nahkodaId: formData.nahkodaId,
        abkIds: formData.abkIds,
        gpsDeviceId: formData.gpsDeviceId,
        mesin: formData.mesin.merk ? formData.mesin : null,
        gps: formData.gps.merk ? formData.gps : null,
        sertifikatJalan: formData.sertifikatJalan.nomor ? formData.sertifikatJalan : null,
        dataBahanBakar: formData.dataBahanBakar.kapasitas > 0 ? formData.dataBahanBakar : null,
        asuransi: formData.asuransi.perusahaan ? formData.asuransi : null,
        pelabuhanAsal: formData.pelabuhanAsal || null,
      };

      const url = editingVessel
        ? API_ENDPOINTS.VESSELS.BY_ID(editingVessel.id.toString())
        : API_ENDPOINTS.VESSELS.LIST;
      const method = editingVessel ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vesselData),
      });

      if (response.ok) {
        await fetchVessels();
        resetForm();
        alert(
          editingVessel
            ? "Data kapal berhasil diupdate!"
            : "Data kapal berhasil ditambahkan!",
        );
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || "Gagal menyimpan data"}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan data kapal");
    }
  };

  const resetForm = () => {
    setFormData({
      vesselId: "",
      namaKapal: "",
      nomorRegistrasi: "",
      nomorKapal: "",
      pemilik: "",
      tipeKapal: "penangkap_ikan",
      alatTangkap: "Jaring",
      panjangKapal: "",
      lebarKapal: "",
      tinggiKapal: "",
      beratKapal: "",
      netTonnage: "",
      spesifikasi: { kapasitas: "", panjangJaring: "", lebarMataJaring: "", jumlahJaring: "" },
      foto: "",
      statusPelayaran: "docked",
      nahkodaId: null,
      abkIds: [],
      gpsDeviceId: null,
      mesin: { merk: "", daya: "", tahun: "" },
      gps: { merk: "", tipe: "", status: "aktif" },
      sertifikatJalan: { nomor: "", berlaku: "" },
      dataBahanBakar: { kapasitas: 0, jenis: "solar", konsumsi: 0 },
      asuransi: { perusahaan: "", nomor: "", berlaku: "" },
      pelabuhanAsal: "",
    });
    setPhotoPreview("");
    setShowForm(false);
    setEditingVessel(null);
  };

  const handleEdit = (vessel: Vessel) => {
    setFormData({
      vesselId: vessel.vesselId || "",
      namaKapal: vessel.namaKapal,
      nomorRegistrasi: vessel.nomorRegistrasi,
      nomorKapal: vessel.nomorKapal || "",
      pemilik: vessel.pemilik,
      tipeKapal: vessel.tipeKapal,
      alatTangkap: vessel.alatTangkap || "Jaring",
      panjangKapal: vessel.panjangKapal || "",
      lebarKapal: vessel.lebarKapal || "",
      tinggiKapal: vessel.tinggiKapal || "",
      beratKapal: vessel.beratKapal || "",
      netTonnage: vessel.netTonnage || "",
      spesifikasi: { kapasitas: vessel.spesifikasi?.kapasitas || "", panjangJaring: vessel.spesifikasi?.panjangJaring || "", lebarMataJaring: vessel.spesifikasi?.lebarMataJaring || "", jumlahJaring: vessel.spesifikasi?.jumlahJaring || "" },
      foto: vessel.foto || "",
      statusPelayaran: vessel.statusPelayaran,
      nahkodaId: vessel.nahkodaId || null,
      abkIds: vessel.abk?.map((a) => a.id) || [],
      gpsDeviceId: vessel.gpsDeviceId || vessel.gpsDevice?.id || null,
      mesin: {
        merk: vessel.mesin?.merk || "",
        daya: vessel.mesin?.daya || "",
        tahun: vessel.mesin?.tahun || "",
      },
      gps: {
        merk: vessel.gps?.merk || "",
        tipe: vessel.gps?.tipe || "",
        status: (vessel.gps?.status as "aktif") || "aktif",
      },
      sertifikatJalan: {
        nomor: vessel.sertifikatJalan?.nomor || "",
        berlaku: vessel.sertifikatJalan?.berlaku || "",
      },
      dataBahanBakar: {
        kapasitas: vessel.dataBahanBakar?.kapasitas || 0,
        jenis: (vessel.dataBahanBakar?.jenis as "solar") || "solar",
        konsumsi: vessel.dataBahanBakar?.konsumsi || 0,
      },
      asuransi: {
        perusahaan: vessel.asuransi?.perusahaan || "",
        nomor: vessel.asuransi?.nomor || "",
        berlaku: vessel.asuransi?.berlaku || "",
      },
      pelabuhanAsal: (vessel as any).pelabuhanAsal || "",
    });
    setPhotoPreview(vessel.foto || "");
    setEditingVessel(vessel);
    setShowForm(true);
  };

  const handleDelete = async (vesselId: number) => {
    if (!confirm("Yakin ingin menghapus data kapal ini?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        API_ENDPOINTS.VESSELS.BY_ID(vesselId.toString()),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        await fetchVessels();
        alert("Data kapal berhasil dihapus!");
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || "Gagal menghapus data kapal"}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan saat menghapus data kapal");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        setFormData((prev) => ({ ...prev, foto: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredVessels = vessels.filter((vessel) => {
    const matchesSearch =
      vessel.namaKapal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vessel.nomorRegistrasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vessel.pemilik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vessel.vesselId &&
        vessel.vesselId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vessel.nomorKapal &&
        vessel.nomorKapal.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || vessel.statusPelayaran === statusFilter;
    const matchesKategori =
      kategoriFilter === "all" || getKategoriKapal(vessel.beratKapal)?.kode === kategoriFilter;
    return matchesSearch && matchesStatus && matchesKategori;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      maintenance: "bg-yellow-100 text-yellow-700",
      inactive: "bg-red-100 text-red-700",
      sailing: "bg-blue-100 text-blue-700",
      docked: "bg-green-100 text-green-700",
      idle: "bg-gray-100 text-gray-700",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      sailing: <Navigation size={14} />,
      docked: <Anchor size={14} />,
      maintenance: <Wrench size={14} />,
      idle: <Pause size={14} />,
    };
    return icons[status as keyof typeof icons] || <Pause size={14} />;
  };

  const getStatusText = (status: string) => {
    const texts = {
      sailing: "Berlayar",
      docked: "Berlabuh",
      maintenance: "Perbaikan",
      idle: "Diam",
    };
    return texts[status as keyof typeof texts] || "Diam";
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setKategoriFilter("all");
  };

  // Badge kategori kapal berdasarkan GT
  const KategoriBadge = ({ gt }: { gt?: number | string | null }) => {
    const kategori = getKategoriKapal(gt);
    if (!kategori) return <span className="text-xs text-slate-400 italic">GT belum diisi</span>;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${BADGE_COLOR[kategori.color]}`}>
        <Tag size={10} />
        <span>{kategori.range}</span>
        <span className="opacity-50">·</span>
        <span>{kategori.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <Ship
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600"
              size={24}
            />
          </div>
          <p className="text-slate-600 font-medium">Memuat data armada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
             <Ship className="text-blue-600" size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">
              Manajemen Data Kapal
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Manajemen armada dan status operasional
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Tambah Kapal</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Kapal */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 truncate">Total Kapal</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5 tracking-tight">{vessels.length}</p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0 ml-3">
            <Ship size={18} className="text-cyan-600" />
          </div>
        </div>

        {/* Nelayan Kecil */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 truncate">Kecil (&lt;5 GT)</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5 tracking-tight">
              {vessels.filter(v => getKategoriKapal(v.beratKapal)?.kode === 'kecil').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 ml-3">
            <Ship size={18} className="text-emerald-600" />
          </div>
        </div>

        {/* Nelayan Menengah Kecil */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 truncate">Menengah Kecil (5–10 GT)</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5 tracking-tight">
              {vessels.filter(v => getKategoriKapal(v.beratKapal)?.kode === 'menengah_kecil').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 ml-3">
            <Ship size={18} className="text-blue-600" />
          </div>
        </div>

        {/* Nelayan Menengah */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 truncate">Menengah (10–30 GT)</p>
            <p className="text-xl font-bold text-violet-700 mt-0.5 tracking-tight">
              {vessels.filter(v => getKategoriKapal(v.beratKapal)?.kode === 'menengah').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 ml-3">
            <Ship size={18} className="text-violet-600" />
          </div>
        </div>

        {/* Nelayan Besar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 truncate">Besar (&gt;30 GT)</p>
            <p className="text-xl font-bold text-rose-700 mt-0.5 tracking-tight">
              {vessels.filter(v => getKategoriKapal(v.beratKapal)?.kode === 'besar').length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 ml-3">
            <Ship size={18} className="text-rose-600" />
          </div>
        </div>
      </div>

      {/* Search & Filter - Sticky & Consistent Style */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama kapal, vessel ID, nomor registrasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 text-sm transition-all duration-200 shadow-sm hover:border-slate-300"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative min-w-[180px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Filter size={14} className="text-slate-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white shadow-sm hover:border-slate-300 appearance-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="all">Semua Status</option>
                  <option value="sailing">Berlayar</option>
                  <option value="docked">Berlabuh</option>
                  <option value="maintenance">Perbaikan</option>
                  <option value="idle">Diam</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
             </div>

             <div className="relative min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Tag size={14} className="text-slate-400" />
                </div>
                <select
                  value={kategoriFilter}
                  onChange={(e) => setKategoriFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white shadow-sm hover:border-slate-300 appearance-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="all">Semua Kategori GT</option>
                  <option value="kecil">&lt; 5 GT — Nelayan Kecil</option>
                  <option value="menengah_kecil">5–10 GT — Menengah Kecil</option>
                  <option value="menengah">10–30 GT — Menengah</option>
                  <option value="besar">&gt; 30 GT — Besar / Industri</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
             </div>

            {(searchTerm || statusFilter !== "all" || kategoriFilter !== "all") && (
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-all duration-200"
                title="Reset semua filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal - Compact & Clean */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="bg-white px-5 py-3 sticky top-0 z-10 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Ship className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">
                      {editingVessel
                        ? "Edit Data Kapal"
                        : "Tambah Data Kapal Baru"}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {editingVessel
                        ? editingVessel.namaKapal
                        : "Lengkapi informasi kapal"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section 1: Informasi Dasar */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Ship size={14} className="text-blue-600" />
                    Informasi Dasar Kapal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Vessel ID *
                      </label>
                      <input
                        type="text"
                        value={formData.vesselId}
                        onChange={(e) =>
                          setFormData({ ...formData, vesselId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="VID-001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Nama Kapal *
                      </label>
                      <input
                        type="text"
                        value={formData.namaKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            namaKapal: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        No. Registrasi *
                      </label>
                      <input
                        type="text"
                        value={formData.nomorRegistrasi}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nomorRegistrasi: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                        placeholder="Contoh: REG-12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Nomor Kapal *
                      </label>
                      <input
                        type="text"
                        value={formData.nomorKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nomorKapal: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                        placeholder="KM-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Pemilik *
                      </label>
                      <input
                        type="text"
                        value={formData.pemilik}
                        onChange={(e) =>
                          setFormData({ ...formData, pemilik: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Pelabuhan Asal
                      </label>
                      <select
                        value={formData.pelabuhanAsal}
                        onChange={(e) =>
                          setFormData({ ...formData, pelabuhanAsal: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">-- Pilih Pelabuhan --</option>
                        {harborZones.map((zone) => (
                          <option key={zone.id} value={zone.name}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                      {harborZones.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Belum ada pelabuhan. Tambahkan di menu Zonasi Pelabuhan.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Alat Tangkap *
                      </label>
                      <select
                        value={formData.alatTangkap}
                        onChange={(e) =>
                          setFormData({ ...formData, alatTangkap: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      >
                        <option value="">Pilih Alat Tangkap</option>
                        {getAlatTangkapOptions(formData.beratKapal).map((alat) => (
                          <option key={alat} value={alat}>{alat}</option>
                        ))}
                      </select>
                      {formData.beratKapal ? (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          Kategori: <KategoriBadge gt={formData.beratKapal} />
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Isi Berat Kapal (GT) untuk rekomendasi alat tangkap
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Panjang Kapal (m)
                      </label>
                      <input
                        type="number"
                        value={formData.panjangKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            panjangKapal: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="0.01"
                        min="0"
                        placeholder="25.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Lebar Kapal (m)
                      </label>
                      <input
                        type="number"
                        value={formData.lebarKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lebarKapal: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="0.01"
                        min="0"
                        placeholder="6.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Tinggi Kapal (m)
                      </label>
                      <input
                        type="number"
                        value={formData.tinggiKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tinggiKapal: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="0.01"
                        min="0"
                        placeholder="3.2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Berat Kapal / GT *
                      </label>
                      <input
                        type="number"
                        value={formData.beratKapal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            beratKapal: e.target.value,
                            alatTangkap: "",
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="0.01"
                        min="0"
                        placeholder="Contoh: 5 (GT)"
                      />
                      {formData.beratKapal && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <KategoriBadge gt={formData.beratKapal} />
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Net Tonnage (NT)
                      </label>
                      <input
                        type="number"
                        value={formData.netTonnage}
                        onChange={(e) =>
                          setFormData({ ...formData, netTonnage: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="0.01"
                        min="0"
                        placeholder="Contoh: 3.5 (NT)"
                      />
                      {formData.netTonnage && formData.beratKapal && (
                        <p className="text-xs text-slate-500 mt-1">
                          Rasio NT/GT:{" "}
                          <span className="font-bold text-slate-700">
                            {(Number(formData.netTonnage) / Number(formData.beratKapal) * 100).toFixed(1)}%
                          </span>
                          <span className="text-slate-400 ml-1">(normal 30–70%)</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Kapasitas (orang)
                      </label>
                      <input
                        type="number"
                        value={formData.spesifikasi.kapasitas}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            spesifikasi: { ...formData.spesifikasi, kapasitas: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        step="1" min="1" placeholder="10"
                      />
                    </div>
                  </div>

                  {/* Sub-section: Spesifikasi Jaring (kondisional) */}
                  {/jaring|pukat/i.test(formData.alatTangkap) && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-bold text-teal-700 mb-2 flex items-center gap-1">
                        <Fish size={12} />
                        Spesifikasi Jaring
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Panjang Jaring (m)</label>
                          <input
                            type="number"
                            value={formData.spesifikasi.panjangJaring}
                            onChange={(e) => setFormData({ ...formData, spesifikasi: { ...formData.spesifikasi, panjangJaring: e.target.value } })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                            step="0.1" min="0" placeholder="100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Lebar Mata Jaring (mm)</label>
                          <input
                            type="number"
                            value={formData.spesifikasi.lebarMataJaring}
                            onChange={(e) => setFormData({ ...formData, spesifikasi: { ...formData.spesifikasi, lebarMataJaring: e.target.value } })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                            step="0.1" min="0" placeholder="25"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Jumlah Jaring (lembar)</label>
                          <input
                            type="number"
                            value={formData.spesifikasi.jumlahJaring}
                            onChange={(e) => setFormData({ ...formData, spesifikasi: { ...formData.spesifikasi, jumlahJaring: e.target.value } })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                            step="1" min="0" placeholder="5"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Crew & Status */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Crew & Status Operasional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Nahkoda
                      </label>
                      <select
                        value={formData.nahkodaId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nahkodaId: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Pilih Nahkoda</option>
                        {getAvailableCrew("nahkoda", editingVessel?.id).map(
                          (nahkoda) => (
                            <option key={nahkoda.id} value={nahkoda.id}>
                              {nahkoda.nama}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Status Pelayaran
                      </label>
                      <select
                        value={formData.statusPelayaran}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            statusPelayaran: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="docked">Berlabuh</option>
                        <option value="sailing">Berlayar</option>
                        <option value="maintenance">Perbaikan</option>
                        <option value="idle">Diam</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        Perangkat GPS
                      </label>
                      <select
                        value={formData.gpsDeviceId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gpsDeviceId: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Pilih GPS Device</option>
                        {gpsDevices.length === 0 ? (
                          <option value="" disabled>
                            Tidak ada GPS device tersedia
                          </option>
                        ) : (
                          gpsDevices
                            .filter(
                              (gps) =>
                                !gps.kapalId ||
                                gps.kapalId === editingVessel?.id,
                            )
                            .map((gps) => {
                              const isAvailable =
                                !gps.kapalId ||
                                gps.kapalId === editingVessel?.id;
                              const statusText =
                                gps.statusOperasional === "aktif"
                                  ? "Aktif"
                                  : gps.statusOperasional === "maintenance"
                                    ? "Maintenance"
                                    : "Tidak Aktif";
                              const availabilityText = isAvailable
                                ? "Tersedia"
                                : "Sudah digunakan";

                              return (
                                <option
                                  key={gps.id}
                                  value={gps.id}
                                  disabled={
                                    !isAvailable &&
                                    gps.statusOperasional !== "aktif"
                                  }
                                >
                                  {gps.namaPerangkat} - {gps.merk} {gps.model} (
                                  {statusText}, {availabilityText})
                                </option>
                              );
                            })
                        )}
                      </select>
                      {gpsDevices.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Belum ada perangkat GPS yang terdaftar. Hubungi
                          admin untuk menambahkan perangkat GPS.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: ABK & Foto */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    ABK & Dokumentasi
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ABK Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Pilih ABK (Anak Buah Kapal)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-3 bg-white">
                        {getAvailableCrew("abk", editingVessel?.id).map(
                          (abk) => {
                            const isSelected = (formData.abkIds || [])
                              .map((id) => Number(id))
                              .includes(Number(abk.id));
                            return (
                              <label
                                key={abk.id}
                                className={`flex items-center space-x-2 p-1.5 rounded border transition-all cursor-pointer select-none text-xs ${
                                  isSelected
                                    ? "bg-blue-100 border-blue-500 ring-1 ring-blue-500"
                                    : "bg-white border-slate-200 hover:border-blue-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleAbkToggle(abk.id, e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span
                                  className={`font-medium truncate ${isSelected ? "text-blue-700" : "text-slate-600"}`}
                                >
                                  {abk.nama}
                                </span>
                              </label>
                            );
                          },
                        )}
                      </div>
                      {getAvailableCrew("abk", editingVessel?.id).length ===
                        0 && (
                        <p className="text-xs text-amber-600 mt-2 italic">
                          Tidak ada ABK tersedia. Semua ABK sudah ditugaskan.
                        </p>
                      )}
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Foto Kapal
                      </label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center gap-3">
                          {photoPreview ? (
                            <div className="relative group">
                              <img
                                src={photoPreview}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-lg border-2 border-slate-200 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoPreview("");
                                  setFormData((prev) => ({
                                    ...prev,
                                    foto: "",
                                  }));
                                }}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400">
                              <Camera size={48} className="mb-3" />
                              <span className="text-sm font-medium">
                                Belum ada foto
                              </span>
                            </div>
                          )}

                          <div className="w-full">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              id="photo-upload"
                              className="hidden"
                            />
                            <label
                              htmlFor="photo-upload"
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-sm"
                            >
                              <Camera size={18} />
                              {photoPreview ? "Ganti Foto" : "Pilih Foto"}
                            </label>
                            <p className="text-xs text-slate-500 text-center mt-2">
                              Format: JPG, PNG. Maks 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200">
                  <p className="text-sm text-slate-500 italic">
                    <span className="text-red-500">*</span> Wajib diisi
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center gap-2"
                    >
                      <X size={18} />
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                      {editingVessel ? (
                        <>
                          <Edit size={18} />
                          Update Data
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Simpan Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vessels Grid */}
      {filteredVessels.length === 0 ? (
        <div className="min-h-[300px] flex flex-col justify-center items-center bg-white rounded-lg border border-slate-100 shadow-sm p-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full blur-2xl opacity-60"></div>
            <div className="relative p-6 bg-slate-50 rounded-full">
              <Anchor size={48} className="text-slate-300" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-700">
            {searchTerm || statusFilter !== "all"
              ? "Tidak Ada Hasil Pencarian"
              : "Belum Ada Data Kapal"}
          </h3>
          <p className="mt-2 text-slate-500 text-center max-w-md">
            {searchTerm || statusFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau filter status"
              : 'Tambahkan data kapal pertama dengan klik tombol "Tambah Kapal"'}
          </p>
          {!(searchTerm || statusFilter !== "all") && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus size={16} />
              Tambah Kapal Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVessels.map((vessel) => (
            <div
              key={vessel.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full group"
            >
              {/* Vessel Image */}
              <div className="h-48 bg-gradient-to-br from-cyan-500 to-blue-600 relative overflow-hidden flex-shrink-0">
                {vessel.foto ? (
                  <img
                    src={vessel.foto}
                    alt={vessel.namaKapal}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <Camera size={48} />
                  </div>
                )}

                {/* Gradient Overlay for Vessel Number */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent"></div>

                {/* Vessel Number on bottom */}
                {vessel.nomorKapal && (
                  <div className="absolute bottom-3 left-4">
                    <span className="text-white font-bold text-lg drop-shadow-md">
                      {vessel.nomorKapal}
                    </span>
                  </div>
                )}

                {/* Status Badge - Flat Pill */}
                <div className="absolute top-3 right-3">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 border border-slate-200 shadow-sm ${
                      vessel.statusPelayaran === "sailing"
                        ? "text-blue-700"
                        : vessel.statusPelayaran === "docked"
                          ? "text-emerald-700"
                          : vessel.statusPelayaran === "maintenance"
                            ? "text-amber-700"
                            : "text-slate-600"
                    }`}
                  >
                    {getStatusIcon(vessel.statusPelayaran)}
                    <span>{getStatusText(vessel.statusPelayaran)}</span>
                  </div>
                </div>

                {/* Vessel ID Badge */}
                {vessel.vesselId && (
                  <div className="absolute top-3 left-3">
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold">
                      {vessel.vesselId}
                    </div>
                  </div>
                )}
              </div>

              {/* Vessel Info - Clean & Scannable */}
              <div className="p-5 flex flex-col flex-1">
                {/* Header */}
                <div className="mb-4">
                  <h3
                    className="font-bold text-slate-800 text-lg mb-1"
                    title={vessel.namaKapal}
                  >
                    {vessel.namaKapal}
                  </h3>
                  <p className="text-sm text-slate-500 mb-1.5">
                    {vessel.nomorRegistrasi}
                  </p>
                  <KategoriBadge gt={vessel.beratKapal} />
                </div>

                {/* Quick Info Grid - 2 Columns */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200/50">
                    <p className="text-xs text-slate-500 font-medium mb-1">
                      Pemilik
                    </p>
                    <p
                      className="text-sm font-bold text-slate-800 truncate"
                      title={vessel.pemilik}
                    >
                      {vessel.pemilik || "-"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-3 border border-teal-200/50">
                    <p className="text-xs text-teal-600 font-medium mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Pelabuhan Asal
                    </p>
                    <p className="text-sm font-bold text-teal-800 truncate" title={(vessel as any).pelabuhanAsal}>
                      {(vessel as any).pelabuhanAsal || <span className="text-slate-400 italic font-normal text-xs">Belum diisi</span>}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg p-3 border border-cyan-200/50">
                    <p className="text-xs text-cyan-600 font-medium mb-1">
                      Dimensi (P x L x T)
                    </p>
                    <p className="text-sm font-bold text-cyan-800">
                      {vessel.panjangKapal !== null && vessel.lebarKapal !== null && vessel.tinggiKapal !== null
                        ? `${Number(vessel.panjangKapal).toFixed(1)} x ${Number(vessel.lebarKapal).toFixed(1)} x ${Number(vessel.tinggiKapal).toFixed(1)} m`
                        : `${vessel.panjangKapal ?? "-"} x ${vessel.lebarKapal ?? "-"} x ${vessel.tinggiKapal ?? "-"} m`}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-3 border border-indigo-200/50">
                    <p className="text-xs text-indigo-600 font-medium mb-1">
                      GT / NT
                    </p>
                    <p className="text-sm font-bold text-indigo-800">
                      {vessel.beratKapal !== null && vessel.beratKapal !== undefined
                        ? `${Number(vessel.beratKapal).toFixed(1)} GT`
                        : "-"}
                      {vessel.netTonnage !== null && vessel.netTonnage !== undefined && (
                        <span className="text-indigo-500 font-medium ml-1">
                          / {Number(vessel.netTonnage).toFixed(1)} NT
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200/50">
                    <p className="text-xs text-orange-600 font-medium mb-1">
                      Alat Tangkap
                    </p>
                    <p className="text-sm font-bold text-orange-800 truncate" title={vessel.alatTangkap}>
                      {vessel.alatTangkap || "-"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
                    <p className="text-xs text-blue-600 font-medium mb-1">
                      Kapasitas
                    </p>
                    <p className="text-sm font-bold text-blue-800">
                      {vessel.spesifikasi?.kapasitas || 0} orang
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50">
                    <p className="text-xs text-emerald-600 font-medium mb-1">
                      Status
                    </p>
                    <p
                      className={`text-sm font-bold capitalize ${
                        vessel.statusOperasional === "active"
                          ? "text-emerald-700"
                          : vessel.statusOperasional === "maintenance"
                            ? "text-amber-700"
                            : "text-slate-600"
                      }`}
                    >
                      {vessel.statusOperasional || "-"}
                    </p>
                  </div>
                </div>

                {/* Crew Section - Vertical Stack */}
                <div className="space-y-2 mb-4 bg-slate-50 rounded-lg p-3 border border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Crown
                      size={16}
                      className={
                        vessel.nahkoda ? "text-amber-500" : "text-slate-300"
                      }
                    />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-medium">
                        Nahkoda
                      </p>
                      <p
                        className={`text-sm font-semibold ${vessel.nahkoda ? "text-slate-800" : "text-slate-400 italic"}`}
                      >
                        {vessel.nahkoda?.nama || "Belum ditentukan"}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <Users
                      size={16}
                      className={
                        vessel.abk?.length ? "text-blue-500" : "text-slate-300"
                      }
                    />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-medium">ABK</p>
                      <p
                        className={`text-sm font-semibold ${vessel.abk?.length ? "text-slate-800" : "text-slate-400 italic"}`}
                      >
                        {vessel.abk?.length
                          ? `${vessel.abk.length} orang`
                          : "Belum ditentukan"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Icon focused */}
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <button
                    onClick={() => { setViewingVessel(vessel); fetchVesselCatches(vessel.id); }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 transition-all duration-200 flex items-center justify-center gap-1.5 border border-transparent hover:border-cyan-200"
                    title="Lihat Detail"
                  >
                    <Eye size={16} />
                    <span className="text-xs font-semibold">Lihat</span>
                  </button>
                  <button
                    onClick={() => handleEdit(vessel)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-all duration-200 flex items-center justify-center gap-1.5 border border-transparent hover:border-blue-200"
                    title="Edit Data"
                  >
                    <Edit size={16} />
                    <span className="text-xs font-semibold">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(vessel.id)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all duration-200 flex items-center justify-center gap-1.5 border border-transparent hover:border-rose-200"
                    title="Hapus Data"
                  >
                    <Trash2 size={16} />
                    <span className="text-xs font-semibold">Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal - Balanced & Clean */}
      {viewingVessel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Ship className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">
                      {viewingVessel.namaKapal}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {viewingVessel.nomorRegistrasi}{" "}
                      {viewingVessel.vesselId && `• ${viewingVessel.vesselId}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingVessel(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Photo */}
                  <div className="relative rounded-xl overflow-hidden shadow-md">
                    <div className="aspect-video bg-gradient-to-br from-cyan-500 to-blue-600">
                      {viewingVessel.foto ? (
                        <img
                          src={viewingVessel.foto}
                          alt={viewingVessel.namaKapal}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                          <Camera size={48} />
                          <span className="mt-2 text-sm">Tidak ada foto</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md bg-white shadow-md ${
                          viewingVessel.statusPelayaran === "sailing"
                            ? "text-blue-700"
                            : viewingVessel.statusPelayaran === "docked"
                              ? "text-emerald-700"
                              : viewingVessel.statusPelayaran === "maintenance"
                                ? "text-amber-700"
                                : "text-slate-700"
                        }`}
                      >
                        {getStatusIcon(viewingVessel.statusPelayaran)}
                        <span>
                          {getStatusText(viewingVessel.statusPelayaran)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GPS Device */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-blue-600" />
                      <h4 className="text-sm font-bold text-black">
                        GPS Device
                      </h4>
                    </div>
                    {viewingVessel.gpsDevice ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-semibold text-emerald-700">
                            Aktif
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-sm font-bold text-black">
                            {viewingVessel.gpsDevice.namaPerangkat}
                          </p>
                          <p className="text-xs text-slate-600">
                            {viewingVessel.gpsDevice.merk}{" "}
                            {viewingVessel.gpsDevice.model}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <span className="w-3 h-3 bg-slate-300 rounded-full"></span>
                        <span className="italic">Tidak terpasang</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Info Kapal */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      Informasi Kapal
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Pemilik
                        </p>
                        <p
                          className="text-sm font-bold text-black truncate"
                          title={viewingVessel.pemilik}
                        >
                          {viewingVessel.pemilik}
                        </p>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                        <p className="text-xs font-semibold text-teal-700 mb-1 flex items-center gap-1">
                          <MapPin size={11} /> Pelabuhan Asal
                        </p>
                        <p className="text-sm font-bold text-teal-900">
                          {(viewingVessel as any).pelabuhanAsal || <span className="text-slate-400 italic font-normal">Belum diisi</span>}
                        </p>
                      </div>
                      <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Nomor Kapal
                        </p>
                        <p className="text-sm font-bold text-black">
                          {viewingVessel.nomorKapal || "-"}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Dimensi (P x L x T)
                        </p>
                        <p className="text-sm font-bold text-black">
                          {viewingVessel.panjangKapal || "-"} x {viewingVessel.lebarKapal || "-"} x {viewingVessel.tinggiKapal || "-"} m
                        </p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">Gross Tonnage (GT)</p>
                        <p className="text-sm font-bold text-black">
                          {viewingVessel.beratKapal ? `${viewingVessel.beratKapal} GT` : "-"}
                        </p>
                      </div>
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">Net Tonnage (NT)</p>
                        <p className="text-sm font-bold text-black">
                          {viewingVessel.netTonnage ? `${viewingVessel.netTonnage} NT` : "-"}
                        </p>
                        {viewingVessel.netTonnage && viewingVessel.beratKapal && (
                          <p className="text-xs text-violet-600 mt-0.5 font-medium">
                            Rasio: {(Number(viewingVessel.netTonnage) / Number(viewingVessel.beratKapal) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">Kategori Kapal (GT)</p>
                        <KategoriBadge gt={viewingVessel.beratKapal} />
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Alat Tangkap
                        </p>
                        <p className="text-sm font-bold text-black truncate" title={viewingVessel.alatTangkap}>
                          {viewingVessel.alatTangkap || "-"}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          Kapasitas
                        </p>
                        <p className="text-sm font-bold text-black">
                          {viewingVessel.spesifikasi?.kapasitas || 0} orang
                        </p>
                      </div>
                      {/jaring|pukat/i.test(viewingVessel.alatTangkap || '') && (
                        <div className="col-span-2 bg-teal-50 rounded-lg p-3 border border-teal-100">
                          <p className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1">
                            <Fish size={11} /> Spesifikasi Jaring
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs text-slate-500">Panjang</p>
                              <p className="text-sm font-bold text-teal-900">
                                {viewingVessel.spesifikasi?.panjangJaring ? `${viewingVessel.spesifikasi.panjangJaring} m` : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Mata Jaring</p>
                              <p className="text-sm font-bold text-teal-900">
                                {viewingVessel.spesifikasi?.lebarMataJaring ? `${viewingVessel.spesifikasi.lebarMataJaring} mm` : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Jumlah</p>
                              <p className="text-sm font-bold text-teal-900">
                                {viewingVessel.spesifikasi?.jumlahJaring ? `${viewingVessel.spesifikasi.jumlahJaring} lembar` : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Crew */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                      <Users size={16} className="text-blue-600" />
                      Crew Kapal
                    </h4>
                    <div className="space-y-2">
                      {viewingVessel.nahkoda ? (
                        <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                          <div className="flex items-center gap-2">
                            <Crown size={14} className="text-amber-600" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-amber-600">
                                Nahkoda
                              </p>
                              <p className="text-sm font-bold text-amber-900">
                                {viewingVessel.nahkoda.nama}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Crown size={14} />
                            <span className="text-xs italic">
                              Nahkoda belum ditentukan
                            </span>
                          </div>
                        </div>
                      )}

                      {viewingVessel.abk && viewingVessel.abk.length > 0 ? (
                        <div className="bg-cyan-50 rounded-lg p-3 border-l-4 border-cyan-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={14} className="text-cyan-600" />
                            <p className="text-xs font-semibold text-cyan-600">
                              ABK ({viewingVessel.abk.length} orang)
                            </p>
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {viewingVessel.abk.map((abk, index) => (
                              <div
                                key={abk.id}
                                className="bg-white rounded px-3 py-2 border border-cyan-100 flex items-center gap-2"
                              >
                                <span className="flex items-center justify-center w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">
                                  {abk.nama}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Users size={14} />
                            <span className="text-xs italic">
                              ABK belum ditentukan
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hasil Tangkap Section */}
            <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200">
              <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                <Fish size={16} className="text-teal-600" />
                Riwayat Hasil Tangkap
                <span className="ml-auto text-xs font-normal text-slate-500">
                  {vesselCatches.length} data
                </span>
              </h4>
              {loadingCatches ? (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-sm">Memuat data tangkapan...</span>
                </div>
              ) : vesselCatches.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Fish size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm italic">Belum ada data hasil tangkap</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {vesselCatches.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg shrink-0">
                        <Fish size={14} className="text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.fishType}</p>
                          <span className="text-xs text-slate-500 shrink-0">{item.date}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            <Scale size={11} />
                            {item.weightKg} kg
                          </span>
                          {item.totalPrice && (
                            <span className="text-xs text-emerald-700 font-semibold">
                              Rp {Number(item.totalPrice).toLocaleString('id-ID')}
                            </span>
                          )}
                          {item.method && (
                            <span className="text-xs text-slate-400 truncate">{item.method}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingVessel(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataKapal;
