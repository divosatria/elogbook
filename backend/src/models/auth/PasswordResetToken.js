const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const crypto = require('crypto');

/**
 * PasswordResetToken Model
 * Manages password reset tokens for user authentication
 */
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

/**
 * Generate a secure random token
 * @returns {string} Random token (64 characters hex)
 */
PasswordResetToken.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a new reset token for a user
 * @param {number} userId - User ID
 * @param {number} expiryHours - Token expiry in hours (default: 1)
 * @returns {Promise<Object>} Created token object
 */
PasswordResetToken.createToken = async function(userId, expiryHours = 1) {
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  return await this.create({
    userId,
    token,
    expiresAt,
    used: false
  });
};

/**
 * Find a valid (not expired, not used) token
 * @param {string} token - Reset token
 * @returns {Promise<Object|null>} Token object or null
 */
PasswordResetToken.findValidToken = async function(token) {
  return await this.findOne({
    where: {
      token,
      used: false,
      expiresAt: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    }
  });
};

/**
 * Mark a token as used
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success status
 */
PasswordResetToken.markAsUsed = async function(token) {
  const result = await this.update(
    { used: true },
    { where: { token } }
  );
  return result[0] > 0;
};

/**
 * Delete expired or used tokens (cleanup)
 * @returns {Promise<number>} Number of deleted tokens
 */
PasswordResetToken.cleanup = async function() {
  const result = await this.destroy({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { used: true },
        {
          expiresAt: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      ]
    }
  });
  return result;
};

/**
 * Delete all tokens for a specific user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of deleted tokens
 */
PasswordResetToken.deleteUserTokens = async function(userId) {
  return await this.destroy({
    where: { userId }
  });
};

module.exports = PasswordResetToken;
