const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VesselCrew = sequelize.define('vessel_crews', {
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
      model: 'Kapals',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('nahkoda', 'abk'),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'vessel_crews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
VesselCrew.associate = (models) => {
  VesselCrew.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });
  VesselCrew.belongsTo(models.Kapal, {
    foreignKey: 'kapalId',
    as: 'kapal'
  });
};

module.exports = VesselCrew;