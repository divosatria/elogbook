const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trip = sequelize.define('Trips', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  kapalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'kapals',
      key: 'id'
    }
  },
  nahkodaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  awakKapal: {
    type: DataTypes.JSON
  },
  tanggalBerangkat: {
    type: DataTypes.DATE,
    allowNull: false
  },
  estimasiPulang: {
    type: DataTypes.DATE,
    allowNull: false
  },
  tanggalPulangAktual: {
    type: DataTypes.DATE
  },
  durasi: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  areaTangkap: {
    type: DataTypes.JSON
  },

  targetIkan: {
    type: DataTypes.STRING
  },
  estimasiBerat: {
    type: DataTypes.INTEGER
  },
  beratAktual: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('menunggu_dokumen', 'menunggu_izin', 'disetujui', 'ditolak', 'sedang_melaut', 'selesai', 'darurat'),
    defaultValue: 'menunggu_dokumen'
  },
  perizinan: {
    type: DataTypes.JSON,
    defaultValue: {
      dokumen: {
        izinMelaut: false,
        dokumenKapal: false,
        asuransi: false
      },
      operasional: {
        kapasitasBensin: 0,
        bensinTersedia: 0,
        kapasitasEs: 0,
        esTersedia: 0
      },
      catatan: null,
      alasanDitolak: null
    }
  },
  kondisiCuaca: {
    type: DataTypes.JSON
  },
  tracking: {
    type: DataTypes.JSON
  },
  laporan: {
    type: DataTypes.JSON
  },
  biaya: {
    type: DataTypes.JSON
  },
  harborZoneId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'harbor_zones',
      key: 'id'
    }
  },
  currentLocation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Real-time vessel location {lat, lng, timestamp}'
  },
  catatan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or comments about the trip'
  }
}, {
  tableName: 'trips',
  timestamps: true,
  underscored: false
});

module.exports = Trip;