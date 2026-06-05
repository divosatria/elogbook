const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { isValidIP, sanitizeIP } = require('../utils/ipValidation');

const User = sequelize.define('Users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nama: {
    type: DataTypes.STRING,
    allowNull: true
  },
  noTelepon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLoginIp: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isValidIP(value) {
        if (value && !isValidIP(value)) {
          throw new Error('Invalid IP address format');
        }
      }
    },
    set(value) {
      // Use proper IP sanitization
      const sanitized = sanitizeIP(value);
      this.setDataValue('lastLoginIp', sanitized);
    }
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'nelayan'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  dokumen: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Profile documents (KTP, SIM, Certificates, etc)'
  },
  alamat: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  foto: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Profile photo filename'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: false,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;