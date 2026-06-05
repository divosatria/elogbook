const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const POI = sequelize.define('POI', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('harbor_office', 'shipping_office', 'customs', 'fuel_station', 
                        'repair_dock', 'warehouse', 'lighthouse', 'pilot_station'),
    allowNull: false
  },
  coordinates: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidCoordinates(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Coordinates must be an object');
        }
        if (typeof value.lat !== 'number' || typeof value.lng !== 'number') {
          throw new Error('Coordinates must have valid lat and lng numbers');
        }
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contact: {
    type: DataTypes.JSON,
    allowNull: true
  },
  operating_hours: {
    type: DataTypes.STRING,
    allowNull: true
  },
  services: {
    type: DataTypes.JSON,
    allowNull: true
  },
  harbor_zone_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'harbor_zones',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'pois',
  timestamps: true,
  underscored: true
});

module.exports = POI;