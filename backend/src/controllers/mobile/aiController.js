
const aiService = require('../../services/ai/aiService');

const aiController = {
  async predictFish(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Silakan upload gambar ikan terlebih dahulu.'
        });
      }

      // Memanggil service hybrid (Lokal -> Threshold -> OpenRouter)
      const result = await aiService.detectFish(
        (req.file.buffer || req.file.path), 
        req.file.originalname, 
        req.file.mimetype
      );
      
      res.json({
        success: true,
        message: 'Prediksi berhasil',
        data: {
          ...result
        },
        models: result.models || []
      });
      
    } catch (error) {
      console.error('❌ Error in AI Controller:', error.message);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        return res.status(503).json({
          success: false,
          message: 'Service AI lokal sedang tidak aktif. Pastikan backend Python (Flask) sudah berjalan.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memproses prediksi gambar',
        error: error.message
      });
    }
  }
};

module.exports = aiController;
