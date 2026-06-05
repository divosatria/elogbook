const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const HasilTangkap = sequelize.define('hasil_tangkap', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  kapalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'kapal_id',
    references: {
      model: 'kapals',
      key: 'id'
    }
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'trip_id',
    references: {
      model: 'trips',
      key: 'id'
    }
  },
  jenisIkan: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'jenis_ikan',
    validate: {
      notEmpty: true
    }
  },
  beratKg: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
    field: 'berat_kg',
    validate: {
      min: 0
    }
  },
  beratMobile: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'berat_mobile',
    comment: 'Berat dari input Manual Mobile App'
  },
  beratIot: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'berat_iot',
    comment: 'Berat dari sensor IOT Device'
  },
  hargaPerKg: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'harga_per_kg',
    validate: {
      customMin: function(value) {
        if (value !== null && value !== undefined && value < 0) {
          throw new Error('Harga per kg tidak boleh negatif');
        }
      }
    }
  },
  totalHarga: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
    field: 'total_harga'
  },
  taxPercentage: {
    type: DataTypes.DECIMAL(5,2),
    allowNull: true,
    field: 'tax_percentage',
    defaultValue: 10.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
    field: 'tax_amount'
  },
  netValue: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
    field: 'net_value'
  },
  lokasi: {
    type: DataTypes.JSON,
    allowNull: true
  },
  tanggalTangkap: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'tanggal_tangkap',
    defaultValue: DataTypes.NOW
  },
  metodeTangkap: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'metode_tangkap'
  },
  kondisiCuaca: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'kondisi_cuaca'
  },
  catatan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'sold'),
    defaultValue: 'confirmed'
  },
  extendedData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Extended catch data from mobile app'
  }
}, {
  tableName: 'hasil_tangkap',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeSave: async (instance) => {
      if (instance.beratKg && instance.hargaPerKg) {
        instance.totalHarga = instance.beratKg * instance.hargaPerKg;
        
        // Calculate tax if tax percentage is set
        if (instance.taxPercentage) {
          instance.taxAmount = (instance.totalHarga * instance.taxPercentage) / 100;
          instance.netValue = instance.totalHarga - instance.taxAmount;
        }
      }
    }
  }
});

module.exports = HasilTangkap;