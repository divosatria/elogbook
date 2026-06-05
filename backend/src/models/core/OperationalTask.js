const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const OperationalTask = sequelize.define('operational_tasks', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  taskTitle: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'task_title'
  },
  taskDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'task_description'
  },
  taskType: {
    type: DataTypes.ENUM('preparation', 'departure', 'fishing', 'return', 'maintenance'),
    allowNull: false,
    defaultValue: 'preparation',
    field: 'task_type'
  },
  assignedTo: {
    type: DataTypes.ENUM('nahkoda', 'abk', 'all'),
    allowNull: false,
    defaultValue: 'all',
    field: 'assigned_to'
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'scheduled_date'
  },
  scheduledTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'scheduled_time'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  catchPolygonId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'catch_polygon_id',
    references: {
      model: 'catch_polygons',
      key: 'id'
    }
  },
  catchPolygonIds: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'catch_polygon_ids',
    comment: 'Array of catch polygon IDs for multiple fishing zones'
  },
  vesselId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'vessel_id',
    references: {
      model: 'kapal',
      key: 'id'
    }
  },
  nahkodaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'nahkoda_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  abkIds: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'abk_ids'
  },
  locationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'location_notes'
  },
  harborZoneId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'harbor_zone_id',
    references: {
      model: 'harbor_zones',
      key: 'id'
    }
  }
}, {
  tableName: 'operational_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = OperationalTask;