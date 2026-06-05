const { FishPrice } = require('../models');

const fishPriceController = {
  // Get all fish prices
  async getAll(req, res) {
    try {
      const fishPrices = await FishPrice.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: fishPrices
      });
    } catch (error) {
      console.error('Error fetching fish prices:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching fish prices',
        error: error.message
      });
    }
  },

  // Create new fish price
  async create(req, res) {
    try {
      const { fishType, pricePerKg, taxPercentage, isActive } = req.body;

      // Enhanced validation
      if (!fishType || typeof fishType !== 'string' || fishType.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Fish type is required and must be a valid string'
        });
      }

      const price = parseFloat(pricePerKg);
      if (!pricePerKg || isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price per kg must be a positive number'
        });
      }

      let tax = 10;
      if (taxPercentage !== undefined) {
        tax = parseFloat(taxPercentage);
        if (isNaN(tax) || tax < 0 || tax > 100) {
          return res.status(400).json({
            success: false,
            message: 'Tax percentage must be between 0 and 100'
          });
        }
      }

      const fishPrice = await FishPrice.create({
        fishType: fishType.trim().toLowerCase(),
        pricePerKg: price,
        taxPercentage: tax,
        isActive: isActive !== undefined ? isActive : true
      });

      res.status(201).json({
        success: true,
        data: fishPrice,
        message: 'Fish price created successfully'
      });
    } catch (error) {
      console.error('Error creating fish price:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating fish price',
        error: error.message
      });
    }
  },

  // Update fish price
  async update(req, res) {
    try {
      const { id } = req.params;
      const { fishType, pricePerKg, taxPercentage, isActive } = req.body;

      // Validate ID
      const fishPriceId = parseInt(id);
      if (isNaN(fishPriceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fish price ID'
        });
      }

      const fishPrice = await FishPrice.findByPk(fishPriceId);
      if (!fishPrice) {
        return res.status(404).json({
          success: false,
          message: 'Fish price not found'
        });
      }

      // Validate inputs if provided
      const updateData = {};
      
      if (fishType !== undefined) {
        if (typeof fishType !== 'string' || fishType.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Fish type must be a valid string'
          });
        }
        updateData.fishType = fishType.trim().toLowerCase();
      }

      if (pricePerKg !== undefined) {
        const price = parseFloat(pricePerKg);
        if (isNaN(price) || price <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Price per kg must be a positive number'
          });
        }
        updateData.pricePerKg = price;
      }

      if (taxPercentage !== undefined) {
        const tax = parseFloat(taxPercentage);
        if (isNaN(tax) || tax < 0 || tax > 100) {
          return res.status(400).json({
            success: false,
            message: 'Tax percentage must be between 0 and 100'
          });
        }
        updateData.taxPercentage = tax;
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      await fishPrice.update(updateData);
      await fishPrice.reload();

      res.json({
        success: true,
        data: fishPrice,
        message: 'Fish price updated successfully'
      });
    } catch (error) {
      console.error('Error updating fish price:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating fish price',
        error: error.message
      });
    }
  },

  // Delete fish price
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      const fishPriceId = parseInt(id);
      if (isNaN(fishPriceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fish price ID'
        });
      }

      const fishPrice = await FishPrice.findByPk(fishPriceId);
      if (!fishPrice) {
        return res.status(404).json({
          success: false,
          message: 'Fish price not found'
        });
      }

      await fishPrice.destroy();

      res.json({
        success: true,
        message: 'Fish price deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting fish price:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting fish price',
        error: error.message
      });
    }
  }
};

module.exports = fishPriceController;