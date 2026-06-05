import React, { useState, useEffect } from 'react';
import { Fish, DollarSign, Percent, Save, Plus, Trash2, Edit3 } from 'lucide-react';
import { backendAPI } from '../services/backendService';

interface FishPrice {
  id?: number;
  fishType: string;
  pricePerKg: number;
  taxPercentage: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const FishPriceSettings: React.FC = () => {
  const [fishPrices, setFishPrices] = useState<FishPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newFish, setNewFish] = useState<FishPrice>({
    fishType: '',
    pricePerKg: 0,
    taxPercentage: 10,
    isActive: true
  });

  useEffect(() => {
    loadFishPrices();
  }, []);

  const loadFishPrices = async () => {
    try {
      setLoading(true);
      const response = await backendAPI.getFishPrices();
      setFishPrices(response.data || []);
    } catch (error) {
      console.error('Error loading fish prices:', error);
      // Default fish types if API fails
      setFishPrices([
        { fishType: 'Tuna', pricePerKg: 50000, taxPercentage: 10, isActive: true },
        { fishType: 'Kakap', pricePerKg: 35000, taxPercentage: 10, isActive: true },
        { fishType: 'Kerapu', pricePerKg: 80000, taxPercentage: 15, isActive: true },
        { fishType: 'Baronang', pricePerKg: 25000, taxPercentage: 8, isActive: true },
        { fishType: 'Cakalang', pricePerKg: 30000, taxPercentage: 10, isActive: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveFishPrice = async (fishPrice: FishPrice) => {
    try {
      setSaving(true);
      if (fishPrice.id) {
        await backendAPI.updateFishPrice(fishPrice.id, fishPrice);
      } else {
        await backendAPI.createFishPrice(fishPrice);
      }
      await loadFishPrices();
      setEditingId(null);
      setNewFish({ fishType: '', pricePerKg: 0, taxPercentage: 10, isActive: true });
    } catch (error) {
      console.error('Error saving fish price:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteFishPrice = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data harga ikan ini?')) return;
    
    try {
      await backendAPI.deleteFishPrice(id);
      await loadFishPrices();
    } catch (error) {
      console.error('Error deleting fish price:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const FishPriceRow = ({ fish, isEditing }: { fish: FishPrice; isEditing: boolean }) => {
    const [editData, setEditData] = useState(fish);

    if (isEditing) {
      return (
        <tr className="bg-blue-50">
          <td className="px-4 py-3">
            <input
              type="text"
              value={editData.fishType}
              onChange={(e) => setEditData({ ...editData, fishType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nama ikan"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="number"
              value={editData.pricePerKg}
              onChange={(e) => setEditData({ ...editData, pricePerKg: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Harga per kg"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="number"
              value={editData.taxPercentage}
              onChange={(e) => setEditData({ ...editData, taxPercentage: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Persentase pajak"
              min="0"
              max="100"
            />
          </td>
          <td className="px-4 py-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.isActive}
                onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Aktif</span>
            </label>
          </td>
          <td className="px-4 py-3">
            <div className="flex space-x-2">
              <button
                onClick={() => saveFishPrice(editData)}
                disabled={saving}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-3 font-medium text-slate-800">{fish.fishType}</td>
        <td className="px-4 py-3 text-slate-600">{formatCurrency(fish.pricePerKg)}</td>
        <td className="px-4 py-3 text-slate-600">{fish.taxPercentage}%</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            fish.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {fish.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingId(fish.id || 0)}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit3 size={16} />
            </button>
            {fish.id && (
              <button
                onClick={() => deleteFishPrice(fish.id!)}
                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Fish size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pengaturan Harga Ikan</h2>
            <p className="text-slate-500">Kelola harga dan persentase pajak untuk setiap jenis ikan</p>
          </div>
        </div>
      </div>

      {/* Add New Fish Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <Plus size={20} className="mr-2" />
          Tambah Jenis Ikan Baru
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Ikan</label>
            <input
              type="text"
              value={newFish.fishType}
              onChange={(e) => setNewFish({ ...newFish, fishType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Tuna"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Harga per Kg (Rp)</label>
            <input
              type="number"
              value={newFish.pricePerKg}
              onChange={(e) => setNewFish({ ...newFish, pricePerKg: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="50000"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pajak (%)</label>
            <input
              type="number"
              value={newFish.taxPercentage}
              onChange={(e) => setNewFish({ ...newFish, taxPercentage: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10"
              min=""
              max="100"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => saveFishPrice(newFish)}
              disabled={!newFish.fishType || newFish.pricePerKg <= 0 || saving}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>

      {/* Fish Prices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Jenis Ikan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Harga per Kg
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pajak
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {fishPrices.map((fish, index) => (
                <FishPriceRow
                  key={fish.id || index}
                  fish={fish}
                  isEditing={editingId === (fish.id || 0)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {fishPrices.length === 0 && (
        <div className="text-center py-12">
          <Fish size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Belum ada data harga ikan</p>
          <p className="text-slate-400 text-sm">Tambahkan jenis ikan dan harga di form di atas</p>
        </div>
      )}
    </div>
  );
};

export default FishPriceSettings;