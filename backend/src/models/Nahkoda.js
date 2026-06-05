const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Nahkoda = sequelize.define('Nahkodas', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nama: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nik: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  alamat: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  noTelepon: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING
  },
  tanggalLahir: {
    type: DataTypes.DATE,
    allowNull: false
  },
  jenisKelamin: {
    type: DataTypes.ENUM('L', 'P'),
    allowNull: false
  },
  statusPernikahan: {
    type: DataTypes.ENUM('belum_menikah', 'menikah', 'cerai'),
    defaultValue: 'belum_menikah'
  },
  pendidikan: {
    type: DataTypes.ENUM('SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3'),
    defaultValue: 'SMA'
  },
  pengalaman: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sertifikat: {
    type: DataTypes.JSON
  },
  foto: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  kontakDarurat: {
    type: DataTypes.JSON
  },
  statusAktif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  catatan: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'nahkodas',
  timestamps: true,
  underscored: true
});

module.exports = Nahkoda;