const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TripTask = sequelize.define('trip_tasks', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Trips',
      key: 'id'
    }
  },
  taskTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  taskDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  taskType: {
    type: DataTypes.ENUM('preparation', 'departure', 'fishing', 'return', 'maintenance'),
    defaultValue: 'preparation'
  },
  assignedTo: {
    type: DataTypes.ENUM('nahkoda', 'abk', 'all'),
    defaultValue: 'all'
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  scheduledTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  catchPolygonId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'CatchPolygons',
      key: 'id'
    }
  },
  catchPolygonIds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of catch polygon IDs for multiple fishing zones'
  },
  locationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  vesselId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Kapals',
      key: 'id'
    }
  },
  nahkodaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  abkIds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of ABK user IDs'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  harborZoneId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'harbor_zones',
      key: 'id'
    }
  }
}, {
  tableName: 'trip_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TripTask;