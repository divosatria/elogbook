const express = require('express');
const router = express.Router();
const { HarborZone, Trip } = require('../../models');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR, ALL_WEB } = require('../../middleware/auth/auth');
const { sequelize } = require('../../config/database');

// Public: GET all (dipakai peta mobile juga)
router.get('/', async (req, res) => {
  try {
    const zones = await HarborZone.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch harbor zones' });
  }
});

// Write: admin + operator
router.post('/', authenticate, authorize(ADMIN_OPERATOR), async (req, res) => {
  try {
    const { name, coordinates, type, shape_type, radius } = req.body;
    if (!name || !coordinates) return res.status(400).json({ success: false, message: 'Name and coordinates are required' });

    const shapeType = shape_type || 'circle';
    if (shapeType === 'circle') {
      if (!coordinates.lat || !coordinates.lng || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number')
        return res.status(400).json({ success: false, message: 'Circle requires coordinates with valid lat and lng numbers' });
      if (coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lng < -180 || coordinates.lng > 180)
        return res.status(400).json({ success: false, message: 'Coordinates out of valid range' });
    } else if (shapeType === 'polygon') {
      if (!Array.isArray(coordinates) || coordinates.length < 3)
        return res.status(400).json({ success: false, message: 'Polygon requires at least 3 coordinate points' });
      for (let i = 0; i < coordinates.length; i++) {
        const point = coordinates[i];
        if (!point.lat || !point.lng || typeof point.lat !== 'number' || typeof point.lng !== 'number')
          return res.status(400).json({ success: false, message: `Point ${i} must have valid lat and lng numbers` });
        if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180)
          return res.status(400).json({ success: false, message: `Point ${i} coordinates out of valid range` });
      }
    }

    const validTypes = ['harbor', 'port', 'anchorage', 'restricted', 'conservation'];
    if (type && !validTypes.includes(type)) return res.status(400).json({ success: false, message: 'Invalid zone type' });

    const zoneData = { name, coordinates, type: type || 'harbor', shape_type: shapeType };
    if (shapeType === 'circle' && radius) zoneData.radius = radius;

    const newZone = await HarborZone.create(zoneData);
    res.status(201).json({ success: true, data: newZone });
  } catch (error) {
    console.error('Error creating harbor zone:', error);
    if (error.name === 'SequelizeValidationError')
      return res.status(400).json({ success: false, message: error.errors[0]?.message || 'Validation error' });
    res.status(500).json({ success: false, message: 'Failed to create harbor zone' });
  }
});

router.put('/:id', authenticate, authorize(ADMIN_OPERATOR), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, coordinates, type, isActive, shape_type, radius } = req.body;

    if (coordinates) {
      const shapeType = shape_type || 'circle';
      if (shapeType === 'circle') {
        if (!coordinates.lat || !coordinates.lng || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number')
          return res.status(400).json({ success: false, message: 'Circle requires coordinates with valid lat and lng numbers' });
        if (coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lng < -180 || coordinates.lng > 180)
          return res.status(400).json({ success: false, message: 'Coordinates out of valid range' });
      } else if (shapeType === 'polygon') {
        if (!Array.isArray(coordinates) || coordinates.length < 3)
          return res.status(400).json({ success: false, message: 'Polygon requires at least 3 coordinate points' });
        for (let i = 0; i < coordinates.length; i++) {
          const point = coordinates[i];
          if (!point.lat || !point.lng || typeof point.lat !== 'number' || typeof point.lng !== 'number')
            return res.status(400).json({ success: false, message: `Point ${i} must have valid lat and lng numbers` });
          if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180)
            return res.status(400).json({ success: false, message: `Point ${i} coordinates out of valid range` });
        }
      }
    }

    const validTypes = ['harbor', 'port', 'anchorage', 'restricted', 'conservation'];
    if (type && !validTypes.includes(type)) return res.status(400).json({ success: false, message: 'Invalid zone type' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (coordinates !== undefined) updateData.coordinates = coordinates;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (shape_type !== undefined) updateData.shape_type = shape_type;
    if (radius !== undefined) updateData.radius = radius;

    const [updatedRows] = await HarborZone.update(updateData, { where: { id } });
    if (updatedRows === 0) return res.status(404).json({ success: false, message: 'Harbor zone not found' });

    const updatedZone = await HarborZone.findByPk(id);
    res.json({ success: true, data: updatedZone });
  } catch (error) {
    console.error('Error updating harbor zone:', error);
    if (error.name === 'SequelizeValidationError')
      return res.status(400).json({ success: false, message: error.errors[0]?.message || 'Validation error' });
    res.status(500).json({ success: false, message: 'Failed to update harbor zone' });
  }
});

router.patch('/:id/toggle-status', authenticate, authorize(ADMIN_OPERATOR), async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await sequelize.query('UPDATE harbor_zones SET is_active = NOT is_active WHERE id = ?', { replacements: [id] });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Harbor zone not found' });
    const updatedZone = await HarborZone.findByPk(id);
    res.json({ success: true, data: updatedZone, message: `Zone status toggled to ${updatedZone.is_active ? 'active' : 'inactive'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle harbor zone status' });
  }
});

router.patch('/:id/test-toggle', authenticate, authorize(ADMIN_OPERATOR), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sequelize.query('UPDATE harbor_zones SET is_active = NOT is_active WHERE id = ?', { replacements: [id] });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Harbor zone not found' });
    const updatedZone = await HarborZone.findByPk(id);
    res.json({ success: true, data: updatedZone, message: `Zone ${id} toggled to ${updatedZone.is_active ? 'active' : 'inactive'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to test toggle' });
  }
});

// Delete: admin only
router.delete('/:id', authenticate, authorize(ADMIN_ONLY), async (req, res) => {
  try {
    const { id } = req.params;
    const usedInTrips = await Trip.count({ where: { harborZoneId: id } });
    if (usedInTrips > 0)
      return res.status(400).json({ success: false, message: `Cannot delete this zone because it is used by ${usedInTrips} trip(s).` });

    const deletedRows = await HarborZone.destroy({ where: { id } });
    if (deletedRows === 0) return res.status(404).json({ success: false, message: 'Harbor zone not found' });
    res.json({ success: true, message: 'Harbor zone deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete harbor zone' });
  }
});

module.exports = router;
