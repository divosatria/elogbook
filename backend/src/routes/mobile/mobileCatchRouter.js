const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

// Submit catch data - DEPRECATED (Moved to mobileCatchController)
router.post('/catches-deprecated', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa submit data tangkapan'
      });
    }

    const {
      fish_name, fish_type, weight, quantity, condition,
      price_per_kg, total_revenue, kapalId
    } = req.body;

    if (!fish_name || !weight || !kapalId) {
      return res.status(400).json({
        success: false,
        message: 'fish_name, weight, dan kapalId wajib diisi'
      });
    }

    // Create catch record
    const catchData = await HasilTangkap.create({
      fish_name,
      fish_type,
      weight: parseFloat(weight),
      quantity: parseInt(quantity) || 1,
      condition,
      price_per_kg: parseFloat(price_per_kg) || 0,
      total_revenue: parseFloat(total_revenue) || 0,
      kapalId: parseInt(kapalId),
      userId: req.user.userId,
      sync_status: 'Synced',
      last_sync_attempt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Data tangkapan berhasil disimpan',
      data: {
        id: catchData.id,
        sync_status: 'Synced',
        last_sync_attempt: catchData.last_sync_attempt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      sync_status: 'Failed'
    });
  }
});

// Get catch history - DEPRECATED (Moved to mobileCatchController)
router.get('/catches-deprecated', authenticate, async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'nahkoda' && role !== 'abk') {
      return res.status(403).json({
        success: false,
        message: 'Hanya nahkoda dan ABK yang bisa melihat data tangkapan'
      });
    }

    const catches = await HasilTangkap.findAll({
      where: { userId },
      include: [{
        model: Kapal,
        as: 'kapal',
        attributes: ['namaKapal']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const catchData = catches.map(c => ({
      id: c.id,
      fish_name: c.fish_name,
      weight: c.weight,
      total_revenue: c.total_revenue,
      departure_date: c.createdAt,
      vessel_name: c.kapal?.namaKapal,
      sync_status: c.sync_status || 'Synced',
      quantity: c.quantity,
      condition: c.condition,
      net_profit: c.total_revenue || 0
    }));

    res.json({
      success: true,
      data: catchData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
