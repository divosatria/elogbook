const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HarborZone = sequelize.define('harborZone', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  coordinates: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Center point (for circle) or array of points (for polygon)',
    validate: {
      isValidCoordinates(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Coordinates must be an object or array');
        }
        
        // Support both single point (circle) and polygon (array of points)
        if (Array.isArray(value)) {
          // Polygon mode
          if (value.length < 3) {
            throw new Error('Polygon must have at least 3 points');
          }
          value.forEach((point, index) => {
            if (!point.lat || !point.lng) {
              throw new Error(`Point ${index} must have lat and lng`);
            }
            if (point.lat < -90 || point.lat > 90) {
              throw new Error(`Point ${index} latitude must be between -90 and 90`);
            }
            if (point.lng < -180 || point.lng > 180) {
              throw new Error(`Point ${index} longitude must be between -180 and 180`);
            }
          });
        } else {
          // Circle mode (single point)
          if (typeof value.lat !== 'number' || typeof value.lng !== 'number') {
            throw new Error('Coordinates must have valid lat and lng numbers');
          }
          if (value.lat < -90 || value.lat > 90) {
            throw new Error('Latitude must be between -90 and 90');
          }
          if (value.lng < -180 || value.lng > 180) {
            throw new Error('Longitude must be between -180 and 180');
          }
        }
      }
    }
  },
  shape_type: {
    type: DataTypes.ENUM('circle', 'polygon'),
    defaultValue: 'circle',
    comment: 'Shape type: circle (uses radius) or polygon (uses coordinates array)'
  },
  type: {
    type: DataTypes.ENUM('harbor', 'port', 'anchorage', 'restricted', 'conservation'),
    defaultValue: 'harbor'
  },
  radius: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    comment: 'Radius in meters'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum vessel capacity'
  },
  facilities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Available facilities'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#10b981',
    comment: 'Zone color in hex format',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/i
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'harbor_zones',
  timestamps: true,
  underscored: true
});

module.exports = HarborZone;