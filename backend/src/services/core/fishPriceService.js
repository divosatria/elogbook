const { FishPrice } = require('../../models');

const fishPriceService = {
  // Get fish price and tax info by fish type
  async getFishPriceInfo(fishType) {
    try {
      const normalizedFishType = fishType.trim().toLowerCase();
      
      const fishPrice = await FishPrice.findOne({
        where: {
          fishType: normalizedFishType,
          isActive: true
        }
      });

      if (!fishPrice) {
        return {
          found: false,
          fishType: normalizedFishType,
          pricePerKg: null,
          taxPercentage: 10, // Default tax if no specific price found
          message: 'Fish price not configured, using default tax rate'
        };
      }

      return {
        found: true,
        fishType: fishPrice.fishType,
        pricePerKg: parseFloat(fishPrice.pricePerKg),
        taxPercentage: parseFloat(fishPrice.taxPercentage),
        message: 'Fish price found'
      };
    } catch (error) {
      console.error('Error getting fish price info:', error);
      return {
        found: false,
        fishType: fishType.trim().toLowerCase(),
        pricePerKg: null,
        taxPercentage: 10, // Default tax on error
        error: error.message
      };
    }
  },

  // Calculate tax for catch report
  async calculateCatchTax(fishType, weightKg, customPricePerKg = null) {
    try {
      const priceInfo = await this.getFishPriceInfo(fishType);
      
      // Use custom price if provided, otherwise use configured price
      const pricePerKg = customPricePerKg || priceInfo.pricePerKg;
      
      if (!pricePerKg) {
        return {
          success: false,
          message: 'Price per kg is required for tax calculation',
          taxPercentage: priceInfo.taxPercentage,
          taxAmount: 0,
          totalValue: 0,
          netValue: 0
        };
      }

      const totalValue = weightKg * pricePerKg;
      const taxAmount = (totalValue * priceInfo.taxPercentage) / 100;
      const netValue = totalValue - taxAmount;

      return {
        success: true,
        fishType: priceInfo.fishType,
        weightKg: parseFloat(weightKg),
        pricePerKg: parseFloat(pricePerKg),
        totalValue: parseFloat(totalValue.toFixed(2)),
        taxPercentage: priceInfo.taxPercentage,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        netValue: parseFloat(netValue.toFixed(2)),
        priceConfigured: priceInfo.found,
        message: priceInfo.message
      };
    } catch (error) {
      console.error('Error calculating catch tax:', error);
      return {
        success: false,
        error: error.message,
        taxAmount: 0,
        totalValue: 0,
        netValue: 0
      };
    }
  },

  // Get all active fish prices for dropdown/selection
  async getActiveFishPrices() {
    try {
      const fishPrices = await FishPrice.findAll({
        where: { isActive: true },
        order: [['fishType', 'ASC']],
        attributes: ['id', 'fishType', 'pricePerKg', 'taxPercentage']
      });

      return {
        success: true,
        data: fishPrices.map(fp => ({
          id: fp.id,
          fishType: fp.fishType,
          pricePerKg: parseFloat(fp.pricePerKg),
          taxPercentage: parseFloat(fp.taxPercentage)
        }))
      };
    } catch (error) {
      console.error('Error getting active fish prices:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
};

module.exports = fishPriceService;