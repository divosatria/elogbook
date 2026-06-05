const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FishPrice = sequelize.define('fish_prices', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fishType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    },
    set(value) {
      // Normalize to lowercase to prevent case-sensitive duplicates
      this.setDataValue('fishType', value ? value.trim().toLowerCase() : value);
    }
  },
  pricePerKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  taxPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'fish_prices',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['fishType']
    }
  ]
});

module.exports = FishPrice;