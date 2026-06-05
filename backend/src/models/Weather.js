const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Weather = sequelize.define('Weathers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tanggal: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lokasi: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Location data with name and coordinates'
  },
  suhu: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Temperature in Celsius'
  },
  kecepatanAngin: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Wind speed in km/h'
  },
  arahAngin: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Wind direction'
  },
  tinggiGelombang: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Wave height in meters'
  },
  visibility: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Visibility in km'
  },
  tekananUdara: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Air pressure in hPa'
  },
  kelembaban: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Humidity percentage'
  },
  kondisi: {
    type: DataTypes.ENUM('cerah', 'berawan', 'mendung', 'hujan_ringan', 'hujan_lebat', 'badai'),
    allowNull: true,
    defaultValue: 'berawan'
  },
  peringatan: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Warning data with level and message'
  },
  prediksi24Jam: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '24-hour forecast data'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'OpenWeatherMap',
    comment: 'Data source'
  }
}, {
  tableName: 'weather',
  timestamps: true,
  underscored: true
});

module.exports = Weather;