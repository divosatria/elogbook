const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CatchPolygon = sequelize.define('catch_polygons', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coordinates: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of lat/lng coordinates forming the polygon'
  },
  zone_type: {
    type: DataTypes.ENUM('fishing', 'restricted', 'conservation', 'special'),
    defaultValue: 'fishing',
    field: 'zone_type'
  },
  fish_types: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'fish_types',
    comment: 'Array of fish types allowed in this zone'
  },
  max_vessels: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_vessels'
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3b82f6',
    allowNull: false
  },
  regulations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Zone regulations and restrictions'
  },
  seasonal_restrictions: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'seasonal_restrictions'
  },
  min_gt: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'min_gt',
    comment: 'Minimum GT kapal yang diizinkan masuk zona ini'
  },
  max_gt: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    field: 'max_gt',
    comment: 'Maximum GT kapal yang diizinkan masuk zona ini'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'catch_polygons',
  timestamps: true,
  underscored: true,
  getterMethods: {
    zoneType() {
      return this.getDataValue('zone_type');
    },
    fishTypes() {
      return this.getDataValue('fish_types');
    },
    maxVessels() {
      return this.getDataValue('max_vessels');
    },
    seasonalRestrictions() {
      return this.getDataValue('seasonal_restrictions');
    },
    isActive() {
      return this.getDataValue('is_active');
    }
  }
});

module.exports = CatchPolygon;