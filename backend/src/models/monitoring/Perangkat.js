const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Perangkat = sequelize.define('perangkats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  namaPerangkat: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nama perangkat (GPS, Radio, Sonar, dll)'
  },
  jenisPerangkat: {
    type: DataTypes.ENUM('gps', 'radio', 'sonar', 'radar', 'kompas', 'mesin', 'alat_tangkap', 'keselamatan', 'lainnya'),
    allowNull: false,
    defaultValue: 'lainnya'
  },
  merk: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Merk/brand perangkat'
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Model perangkat'
  },
  nomorSeri: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Serial number perangkat'
  },
  tahunPembuatan: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  kondisi: {
    type: DataTypes.ENUM('baik', 'rusak_ringan', 'rusak_berat', 'tidak_berfungsi'),
    defaultValue: 'baik'
  },
  statusOperasional: {
    type: DataTypes.ENUM('aktif', 'maintenance', 'rusak', 'tidak_digunakan'),
    defaultValue: 'aktif'
  },
  tanggalPembelian: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hargaPembelian: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Harga pembelian dalam rupiah'
  },
  spesifikasi: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Spesifikasi teknis perangkat'
  },
  foto: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Path foto perangkat'
  },
  keterangan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Keterangan tambahan'
  },
  kapalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'kapals',
      key: 'id'
    },
    comment: 'ID kapal yang menggunakan perangkat (null jika perangkat cadangan)'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'perangkats',
  timestamps: true,
  underscored: false
});

module.exports = Perangkat;