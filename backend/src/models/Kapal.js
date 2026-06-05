const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Kapal = sequelize.define('kapals', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true, 
    autoIncrement: true
  },
  vesselId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique vessel identifier'
  },
  namaKapal: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nomorRegistrasi: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  nomorKapal: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pemilik: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipeKapal: {
    type: DataTypes.ENUM('penangkap_ikan', 'pengangkut_ikan', 'penelitian', 'patroli'),
    defaultValue: 'penangkap_ikan'
  },
  spesifikasi: {
    type: DataTypes.JSON
  },
  alatTangkap: {
    type: DataTypes.STRING,
    allowNull: false
  },
  panjangKapal: {
    type: DataTypes.DECIMAL(10,2)
  },
  lebarKapal: {
    type: DataTypes.DECIMAL(10,2)
  },
  tinggiKapal: {
    type: DataTypes.DECIMAL(10,2)
  },
  beratKapal: {
    type: DataTypes.DECIMAL(10,2),
    comment: 'Gross Tonnage (GT)'
  },
  netTonnage: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    comment: 'Net Tonnage (NT) - kapasitas ruang muat'
  },
  mesin: {
    type: DataTypes.JSON
  },
  gps: {
    type: DataTypes.JSON
  },
  gpsDeviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'perangkats',
      key: 'id'
    },
    comment: 'ID perangkat GPS yang digunakan kapal'
  },
  foto: {
    type: DataTypes.TEXT('long')
  },
  statusOperasional: {
    type: DataTypes.ENUM('active', 'maintenance', 'inactive'),
    defaultValue: 'active'
  },
  statusPelayaran: {
    type: DataTypes.ENUM('sailing', 'docked', 'maintenance', 'idle'),
    defaultValue: 'docked'
  },
  nahkodaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dokumen: {
    type: DataTypes.JSON
  },
  sertifikatJalan: {
    type: DataTypes.JSON
  },
  dataBahanBakar: {
    type: DataTypes.JSON
  },
  storageData: {
    type: DataTypes.JSON,
    comment: 'Ice and fish storage data'
  },
  asuransi: {
    type: DataTypes.JSON
  },
  lastPosition: {
    type: DataTypes.JSON,
    comment: 'Last known position from any trip'
  },
  lastPositionUpdate: {
    type: DataTypes.DATE,
    comment: 'Timestamp of last position update'
  },
  pelabuhanAsal: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Pelabuhan asal/pangkalan tetap kapal (nama teks)'
  },
  pelabuhanAsalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'harbor_zones',
      key: 'id'
    },
    comment: 'FK ke harbor_zones - pelabuhan asal kapal'
  }
}, {
  tableName: 'kapals',
  timestamps: true,
  underscored: false
});

// Define associations
Kapal.associate = (models) => {
  Kapal.belongsTo(models.User, {
    foreignKey: 'nahkodaId',
    as: 'nahkoda'
  });
  
  Kapal.belongsTo(models.Perangkat, {
    foreignKey: 'gpsDeviceId',
    as: 'gpsDevice'
  });

  Kapal.belongsTo(models.HarborZone, {
    foreignKey: 'pelabuhanAsalId',
    as: 'pelabuhanAsalZone'
  });
};

// ============================================================
// HELPER: Kategori Kapal berdasarkan GT (Gross Tonnage)
// Referensi: Permen KP No. 71 Tahun 2016 & regulasi KKP
// ============================================================
const getKategoriKapal = (gt) => {
  const gtNum = parseFloat(gt);
  if (!gt || isNaN(gtNum)) return null;
  if (gtNum < 5)   return { kode: 'kecil',          label: 'Nelayan Kecil (Tradisional)', range: '< 5 GT' };
  if (gtNum <= 10) return { kode: 'menengah_kecil',  label: 'Nelayan Menengah Kecil',      range: '5 – 10 GT' };
  if (gtNum <= 30) return { kode: 'menengah',        label: 'Nelayan Menengah',            range: '10 – 30 GT' };
  return             { kode: 'besar',          label: 'Nelayan Besar / Industri',    range: '> 30 GT' };
};

const getAlatTangkapByKategori = (kodeKategori) => {
  const map = {
    kecil: [
      'Pancing Ulur', 'Jaring Insang Tetap', 'Bubu', 'Sero',
      'Jala Tebar', 'Tombak / Panah', 'Perangkap Ikan'
    ],
    menengah_kecil: [
      'Jaring Insang Hanyut', 'Jaring Insang Tetap', 'Pancing Rawai Dasar',
      'Bubu', 'Bagan Perahu', 'Pancing Ulur', 'Jaring Lingkar Kecil'
    ],
    menengah: [
      'Pukat Cincin Kecil', 'Jaring Insang Hanyut', 'Pancing Rawai Tuna',
      'Bagan Perahu', 'Jaring Angkat', 'Pukat Udang', 'Pancing Tonda'
    ],
    besar: [
      'Pukat Cincin (Purse Seine)', 'Pukat Hela (Trawl)', 'Rawai Tuna (Long Line)',
      'Jaring Insang Pelagis', 'Pukat Udang', 'Pancing Tonda Industri',
      'Jaring Angkat Mekanis'
    ]
  };
  return map[kodeKategori] || [];
};

Kapal.prototype.getKategori = function () {
  return getKategoriKapal(this.beratKapal);
};

module.exports = Kapal;
module.exports.getKategoriKapal = getKategoriKapal;
module.exports.getAlatTangkapByKategori = getAlatTangkapByKategori;