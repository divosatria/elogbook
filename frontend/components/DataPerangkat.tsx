import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye, Ship, Radio, Radar, Compass, Wrench, Anchor, Shield, Package, ChevronLeft, ChevronRight, X, Filter, MoreHorizontal, Waves, CheckCircle, AlertTriangle, XCircle, Cpu } from 'lucide-react';




import { apiUrl } from "../config/api";

// --- INTERFACES ---
interface Perangkat {
  id: number;
  namaPerangkat: string;
  jenisPerangkat: string;
  nomorSeri: string;
  statusOperasional: string;
  fotoUrl?: string;
}

interface Statistics {
  totalPerangkat: number;
  perangkatTanpaKapal: number;
  perangkatTerpasang: number;
  byKondisi: Array<{ kondisi: string; count: number }>;
}

const DataPerangkat: React.FC = () => {
  // --- STATE MANAGEMENT (LOGIC TIDAK BERUBAH) ---
  const [perangkats, setPerangkats] = useState<Perangkat[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [selectedPerangkat, setSelectedPerangkat] = useState<Perangkat | null>(
    null,
  );

  const [formData, setFormData] = useState({
    namaPerangkat: "",
    jenisPerangkat: "gps",
    nomorSeri: "",
    statusOperasional: "aktif",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mapping Icon
  const jenisIcons: any = {
    gps: Ship,
    radio: Radio,
    radar: Radar,
    kompas: Compass,
    mesin: Wrench,
    alat_tangkap: Anchor,
    keselamatan: Shield,
    lainnya: Package,
  };

  useEffect(() => {
    fetchPerangkats();
    fetchStatistics();
  }, [currentPage]); // Note: Search usually needs debounce, but keeping original logic flow

  // Trigger search on enter or when typing stops (optional tweak) or via button
  // For strict adherence to logic, we use the original flow, but here I'll trigger it on effect change if you want,
  // or just pass it to the fetch function as originally written.
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchPerangkats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterJenis, filterStatus]);

  // --- API HANDLERS (LOGIC TIDAK BERUBAH) ---
  const fetchPerangkats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "5",
        ...(searchTerm && { search: searchTerm }),
        ...(filterJenis && { jenis: filterJenis }),
        ...(filterStatus && { status: filterStatus }),
      });

      const response = await fetch(
        apiUrl(`/api/perangkat?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setPerangkats(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching perangkats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/api/perangkat/statistics"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatistics(data.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const submitData = new FormData();
      submitData.append("namaPerangkat", formData.namaPerangkat);
      submitData.append("jenisPerangkat", formData.jenisPerangkat);
      submitData.append("nomorSeri", formData.nomorSeri);
      submitData.append("statusOperasional", formData.statusOperasional);
      
      if (selectedFile) {
        submitData.append("foto", selectedFile);
      }

      const url =
        modalMode === "edit"
          ? apiUrl(`/api/perangkat/${selectedPerangkat?.id}`)
          : apiUrl("/api/perangkat");
      const method = modalMode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setShowModal(false);
      fetchPerangkats();
      fetchStatistics();
      resetForm();
    } catch (error) {
      console.error("Error saving perangkat:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin hapus perangkat ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/api/perangkat/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fetchPerangkats();
      fetchStatistics();
    } catch (error) {
      console.error("Error deleting perangkat:", error);
    }
  };

  // --- HELPERS ---
  const resetForm = () => {
    setFormData({
      namaPerangkat: "",
      jenisPerangkat: "gps",
      nomorSeri: "",
      statusOperasional: "aktif",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterJenis("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  const openModal = (
    mode: "create" | "edit" | "view",
    perangkat?: Perangkat,
  ) => {
    setModalMode(mode);
    setSelectedPerangkat(perangkat || null);
    if (mode === "edit" && perangkat) {
      setFormData({
        namaPerangkat: perangkat.namaPerangkat,
        jenisPerangkat: perangkat.jenisPerangkat,
        nomorSeri: perangkat.nomorSeri || "",
        statusOperasional: perangkat.statusOperasional,
      });
      setPreviewUrl((perangkat as any).fotoUrl ? apiUrl((perangkat as any).fotoUrl) : null);
    } else if (mode === "create") {
      resetForm();
    }
    setShowModal(true);
  };

  // Maritime-themed status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "aktif":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      case "maintenance":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "rusak":
        return "bg-rose-50 text-rose-700 border-rose-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "aktif":
        return <CheckCircle size={14} className="text-emerald-600" />;
      case "maintenance":
        return <AlertTriangle size={14} className="text-amber-600" />;
      case "rusak":
        return <XCircle size={14} className="text-rose-600" />;
      default:
        return <CheckCircle size={14} className="text-slate-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const Icon = jenisIcons[type.toLowerCase()] || Package;
    return <Icon size={18} className="text-blue-600" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* HEADER SECTION - Maritime Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <Cpu className="text-blue-600" size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">
              Manajemen Perangkat
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Kelola inventaris perangkat kapal dan navigasi armada
            </p>
          </div>
        </div>
        <button
          onClick={() => openModal("create")}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Tambah Perangkat</span>
        </button>
      </div>

        {/* STATISTICS CARDS - Glassy & Gradient Style */}
        {statistics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Total Perangkat"
              value={statistics.totalPerangkat}
              icon={Cpu}
              color="cyan"
            />
            <StatCard
              label="Terpasang"
              value={statistics.perangkatTerpasang}
              icon={Ship}
              color="emerald"
            />
            <StatCard
              label="Tanpa Kapal"
              value={statistics.perangkatTanpaKapal}
              icon={Ship}
              color="amber"
            />
            <StatCard
              label="Maintenance/Rusak"
              value={
                statistics.byKondisi.find((k) => k.kondisi !== "aktif")
                  ?.count || 0
              }
              icon={Wrench}
              color="rose"
            />
          </div>
        )}

        {/* TOOLBAR & SEARCH - Sticky & Consistent Style */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm sticky top-0 z-20">
          {/* Main Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama perangkat atau serial number..."
                className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 text-sm transition-all duration-200 shadow-sm hover:border-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-bold transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-400/50 ${
                  showFilters || filterJenis || filterStatus
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Filter size={14} />
                Filter
                {(filterJenis || filterStatus) && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                    {(filterJenis ? 1 : 0) + (filterStatus ? 1 : 0)}
                  </span>
                )}
              </button>
              {(searchTerm || filterJenis || filterStatus) && (
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

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-slate-200 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Jenis Perangkat
                  </label>
                  <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white"
                  >
                    <option value="">Semua Jenis</option>
                    {Object.keys(jenisIcons).map((key) => (
                      <option key={key} value={key} className="capitalize">
                        {key.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white"
                  >
                    <option value="">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="rusak">Rusak</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Info */}
          {(searchTerm || filterJenis || filterStatus) && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>Filter aktif:</span>
                {searchTerm && (
                  <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded-md text-xs font-medium">
                    Pencarian: "{searchTerm}"
                  </span>
                )}
                {filterJenis && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium capitalize">
                    Jenis: {filterJenis.replace("_", " ")}
                  </span>
                )}
                {filterStatus && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium capitalize">
                    Status: {filterStatus}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TABLE SECTION - Maritime Professional */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col justify-center items-center text-slate-500">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-cyan-200 rounded-full animate-spin border-t-cyan-600"></div>
                <Ship
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-cyan-600"
                  size={20}
                />
              </div>
              <p className="mt-4 font-medium text-slate-600">
                Memuat data perangkat...
              </p>
            </div>
          ) : perangkats.length === 0 ? (
            /* EMPTY STATE - Maritime Theme */
            <div className="min-h-[300px] flex flex-col justify-center items-center p-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full blur-2xl opacity-60"></div>
                <div className="relative p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full">
                  <Anchor
                    size={64}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-700">
                Belum Ada Data Armada
              </h3>
              <p className="mt-2 text-slate-500 text-sm text-center max-w-sm">
                Perangkat navigasi dan inventaris kapal Anda akan muncul di sini
                setelah ditambahkan.
              </p>
              <button
                onClick={() => openModal("create")}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all duration-300"
              >
                <Plus size={16} />
                Tambah Perangkat Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Foto</th>
                    <th className="px-6 py-4 text-left">Nama Perangkat</th>
                    <th className="px-6 py-4 text-left">Jenis</th>
                    <th className="px-6 py-4 text-left">Serial Number</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perangkats.map((p) => (
                    <tr
                      key={p.id}
                      className="group hover:bg-blue-50/50 transition-all duration-150"
                    >
                      <td className="px-6 py-4 align-middle">
                        {(p as any).fotoUrl ? (
                          <img 
                            src={apiUrl((p as any).fotoUrl)} 
                            alt={p.namaPerangkat}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm hover:shadow cursor-pointer"
                            onClick={() => openModal("view", p)}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400">
                            <Package size={20} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">
                            {p.namaPerangkat}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            {getTypeIcon(p.jenisPerangkat)}
                          </div>
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                            {p.jenisPerangkat.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <code className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {p.nomorSeri || "-"}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(p.statusOperasional)}`}
                        >
                          {getStatusIcon(p.statusOperasional)}
                          {p.statusOperasional}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => openModal("view", p)}
                            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openModal("edit", p)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {perangkats.length > 0 && (
            <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Halaman{" "}
                <span className="font-semibold text-slate-700">
                  {currentPage}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-700">
                  {Math.max(1, totalPages)}
                </span>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {/* MODAL / DIALOG - Maritime Professional */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop - Frosted Glass Effect */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              aria-hidden="true"
              onClick={() => setShowModal(false)}
            ></div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-slate-200">
              {/* Modal Header */}
              <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      {modalMode === "view" ? (
                        <Eye className="text-blue-600" size={18} />
                      ) : modalMode === "edit" ? (
                        <Edit className="text-blue-600" size={18} />
                      ) : (
                        <Plus className="text-blue-600" size={18} />
                      )}
                    </div>
                    <h3
                      className="text-lg font-bold text-slate-800"
                      id="modal-title"
                    >
                      {modalMode === "view"
                        ? "Detail Perangkat"
                        : modalMode === "edit"
                        ? "Edit Perangkat"
                        : "Tambah Perangkat Baru"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5">
                {modalMode === "view" ? (
                  /* View Mode - Display Only */
                  <div className="space-y-6">
                    {/* Photo Display */}
                    <div className="text-center">
                      {selectedPerangkat && (selectedPerangkat as any).fotoUrl ? (
                        <img 
                          src={apiUrl((selectedPerangkat as any).fotoUrl)} 
                          alt={selectedPerangkat.namaPerangkat}
                          className="w-48 h-48 mx-auto rounded-2xl object-cover border-4 border-slate-200 shadow-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center border-4 border-slate-200">
                          <Package size={64} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Perangkat</label>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg">{selectedPerangkat?.namaPerangkat}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis</label>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg capitalize">{selectedPerangkat?.jenisPerangkat.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Serial Number</label>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg font-mono">{selectedPerangkat?.nomorSeri || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border ${getStatusColor(selectedPerangkat?.statusOperasional || '')} capitalize`}>
                          {getStatusIcon(selectedPerangkat?.statusOperasional || '')}
                          {selectedPerangkat?.statusOperasional}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Form Mode - Create/Edit */
                  <form
                    id="perangkatForm"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nama Perangkat
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-slate-200 border px-4 py-2.5 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all duration-200 bg-slate-50/50 hover:bg-white"
                      placeholder="Contoh: GPS Garmin 585"
                      value={formData.namaPerangkat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          namaPerangkat: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Jenis
                      </label>
                      <select
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm bg-white transition-all duration-200 hover:border-slate-300"
                        value={formData.jenisPerangkat}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jenisPerangkat: e.target.value,
                          })
                        }
                      >
                        {Object.keys(jenisIcons).map((key) => (
                          <option key={key} value={key} className="capitalize">
                            {key.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Serial Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm font-mono transition-all duration-200 bg-slate-50/50 hover:bg-white"
                        placeholder="SN-12345"
                        value={formData.nomorSeri}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nomorSeri: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Status Operasional
                    </label>
                    <select
                      className="w-full rounded-xl border-slate-200 border px-4 py-2.5 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm bg-white transition-all duration-200 hover:border-slate-300"
                      value={formData.statusOperasional}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          statusOperasional: e.target.value,
                        })
                      }
                    >
                      <option value="aktif">Aktif</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="rusak">Rusak</option>
                    </select>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Foto Perangkat
                    </label>
                    <div className="space-y-4">
                      {/* Current/Preview Photo */}
                      {previewUrl && (
                        <div className="relative inline-block">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-32 h-32 rounded-xl object-cover border-2 border-slate-200 shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(null);
                              setSelectedFile(null);
                            }}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      
                      {/* File Input */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                          id="foto-upload"
                        />
                        <label 
                          htmlFor="foto-upload" 
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="p-3 bg-blue-50 rounded-full">
                            <Package size={24} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              Klik untuk upload foto
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              JPG, PNG, WEBP - Maksimal 5MB
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-t border-slate-100 flex flex-row-reverse gap-3">
                {modalMode === "view" ? (
                  /* View Mode Buttons */
                  <>
                    <button
                      onClick={() => {
                        setModalMode("edit");
                        if (selectedPerangkat) {
                          setFormData({
                            namaPerangkat: selectedPerangkat.namaPerangkat,
                            jenisPerangkat: selectedPerangkat.jenisPerangkat,
                            nomorSeri: selectedPerangkat.nomorSeri || "",
                            statusOperasional: selectedPerangkat.statusOperasional,
                          });
                          setPreviewUrl((selectedPerangkat as any).fotoUrl ? apiUrl((selectedPerangkat as any).fotoUrl) : null);
                        }
                      }}
                      className="inline-flex justify-center items-center gap-2 rounded-xl border border-transparent shadow-md px-5 py-2.5 bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-lg"
                    >
                      <Edit size={16} />
                      Edit Perangkat
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="inline-flex justify-center rounded-xl border border-slate-200 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-200"
                    >
                      Tutup
                    </button>
                  </>
                ) : (
                  /* Form Mode Buttons */
                  <>
                    <button
                      type="submit"
                      form="perangkatForm"
                      className="inline-flex justify-center items-center gap-2 rounded-xl border border-transparent shadow-md px-5 py-2.5 bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-lg"
                    >
                      <Shield size={16} />
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="inline-flex justify-center rounded-xl border border-slate-200 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all duration-200"
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS FOR STYLING - Maritime Professional Theme ---
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) => {
  const colorConfig: any = {
    cyan: {
      border: "border-l-cyan-500",
      iconBg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
      iconColor: "text-cyan-600",
      glow: "shadow-cyan-100",
    },
    emerald: {
      border: "border-l-emerald-500",
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
      glow: "shadow-emerald-100",
    },
    amber: {
      border: "border-l-amber-500",
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
      glow: "shadow-amber-100",
    },
    rose: {
      border: "border-l-rose-500",
      iconBg: "bg-gradient-to-br from-rose-50 to-rose-100",
      iconColor: "text-rose-600",
      glow: "shadow-rose-100",
    },
  };

  const config = colorConfig[color] || colorConfig.cyan;

  return (
    <div
      className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-800 mt-0.5 tracking-tight">
          {value}
        </p>
      </div>
      <div
        className={`p-2 rounded-lg ${config.iconBg} flex items-center justify-center`}
      >
        <Icon size={18} className={`${config.iconColor}`} />
      </div>
    </div>
  );
};

export default DataPerangkat;
