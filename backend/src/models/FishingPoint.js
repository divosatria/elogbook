const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FishingPoint = sequelize.define('fishing_points', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'trip_id',
    references: { model: 'trips', key: 'id' }
  },
  kapalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'kapal_id',
    references: { model: 'kapals', key: 'id' }
  },
  submittedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'submitted_by',
    comment: 'User ID (nahkoda atau ABK) yang submit titik ini'
  },
  location: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'GPS coordinates {lat, lng}'
  },
  depthMeters: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'depth_meters',
    comment: 'Kedalaman laut dalam meter'
  },
  actionType: {
    type: DataTypes.ENUM('net_deployed', 'net_retrieved'),
    allowNull: false,
    field: 'action_type',
    defaultValue: 'net_deployed',
    comment: 'Jenis aksi: penurunan atau pengangkatan jaring'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Catatan tambahan'
  },
  hasilTangkapId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'hasil_tangkap_id',
    references: { model: 'hasil_tangkap', key: 'id' },
    comment: 'ID pertama untuk backward compatibility'
  },
  hasilTangkapIds: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'hasil_tangkap_ids',
    defaultValue: [],
    comment: 'Array semua ID hasil tangkap di titik ini'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'fishing_points',
  timestamps: true,
  underscored: true
});

FishingPoint.associate = (models) => {
  FishingPoint.belongsTo(models.Trip, { foreignKey: 'tripId', as: 'trip' });
  FishingPoint.belongsTo(models.Kapal, { foreignKey: 'kapalId', as: 'kapal' });
  FishingPoint.belongsTo(models.HasilTangkap, { foreignKey: 'hasilTangkapId', as: 'hasilTangkap' });
};

module.exports = FishingPoint;
