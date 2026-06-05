const axios = require('axios');
const FormData = require('form-data');

const aiController = {
  async predictFish(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Silakan upload gambar ikan terlebih dahulu.'
        });
      }

      // Siapkan FormData untuk dikirim ke Flask API
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      // Panggil Flask Microservice
      // Gunakan port 5001 sesuai dengan setting di api.py
      const flaskUrl = process.env.FLASK_API_URL || 'http://127.0.0.1:5001/api/predict';
      
      console.log(`🤖 Mengirim gambar ke AI Service di ${flaskUrl}...`);
      
      const response = await axios.post(flaskUrl, formData, {
        headers: formData.getHeaders(),
        // Timeout panjang: model loading + inference + OpenRouter call
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Kembalikan respons dari Flask ke frontend/mobile
      const flaskData = response.data.data;
      res.json({
        success: true,
        message: 'Prediksi berhasil',
        data: {
          ...flaskData,
          fishName: flaskData.best_display_name || 'Ikan Tidak Teridentifikasi'
        },
        models: response.data.models
      });
      
    } catch (error) {
      console.error('❌ Error calling AI Service:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Service AI sedang tidak aktif. Pastikan backend Python sudah berjalan.'
        });
      }

      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: error.response.data?.message || 'Error dari Service AI'
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
