const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Emergency = sequelize.define('Emergencies', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vesselId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'kapals',
      key: 'id'
    }
  },
  location: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'GPS coordinates: {latitude, longitude}'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('SOS', 'EMERGENCY', 'MEDICAL', 'TECHNICAL'),
    defaultValue: 'SOS'
  },
  status: {
    type: DataTypes.ENUM('active', 'resolved', 'cancelled'),
    defaultValue: 'active'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'emergencies',
  timestamps: true,
  underscored: false
});

// Define associations
Emergency.associate = (models) => {
  Emergency.belongsTo(models.Kapal, {
    foreignKey: 'vesselId',
    as: 'vessel'
  });
};

module.exports = Emergency;