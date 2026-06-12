const { EdgeData } = require('../../models');

const edgeController = {


  /**
   * Mengambil data raw IoT dari database untuk ditampilkan di Frontend
   */
  async getRawData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;

      const { count, rows } = await EdgeData.findAndCountAll({
        order: [['received_at', 'DESC']],
        limit,
        offset
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('❌ [Edge Sync] Error fetching raw edge data:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching edge data',
        error: error.message
      });
    }
  }
};

module.exports = edgeController;
