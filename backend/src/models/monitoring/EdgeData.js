const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const EdgeData = sequelize.define('EdgeData', {
  uuid: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    allowNull: false,
    comment: 'UUID of the packet from the Edge device'
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Source of the data (e.g., lora_edge)'
  },
  raw_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Raw JSON data of the packet'
  },
  parsed_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Parsed payload string'
  },
  rssi: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  snr: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  packet_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  suhu_air: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  suhu_kelembaban: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  berat: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  interval: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  trail: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the edge device received the packet'
  }
}, {
  tableName: 'edge_data',
  timestamps: true,
  underscored: true
});

module.exports = EdgeData;
