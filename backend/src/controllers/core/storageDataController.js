const { Kapal } = require('../../models');
const uploadHelper = require('../../utils/uploadHelper');
const { sequelize } = require('../../config/database');

const storageDataController = {
  // POST /api/mobile/vessel/:kapalId/storage-data
  async uploadStorageData(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { kapalId } = req.params;
      const { jumlahEs, kapasitasPenyimpanan, suhuPenyimpanan, kondisiPenyimpanan, keterangan } = req.body;

      const kapal = await Kapal.findByPk(kapalId);
      if (!kapal) {
        return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
      }

      let fotoPath = null;
      if (req.file) {
        const uploadResult = await uploadHelper.saveFile(req.file.buffer, req.file.originalname, `storage/${kapalId}`);
        fotoPath = uploadResult.filePath;
      }

      const storageData = {
        id: Date.now().toString(),
        jumlahEs: parseFloat(jumlahEs),
        kapasitasPenyimpanan: parseFloat(kapasitasPenyimpanan),
        suhuPenyimpanan: parseFloat(suhuPenyimpanan),
        kondisiPenyimpanan,
        keterangan: keterangan || null,
        fotoPath,
        uploadedAt: new Date(),
        uploadedBy: req.user.userId
      };

      const currentStorage = kapal.storageData || [];
      currentStorage.push(storageData);

      await kapal.update({ storageData: currentStorage }, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Data penyimpanan berhasil diupload',
        data: {
          ...storageData,
          fotoUrl: fotoPath ? `${req.protocol}://${req.get('host')}${fotoPath}` : null
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error uploading storage data:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/mobile/vessel/:kapalId/storage-data
  async getStorageData(req, res) {
    try {
      const { kapalId } = req.params;
      const kapal = await Kapal.findByPk(kapalId, { attributes: ['id', 'namaKapal', 'storageData'] });

      if (!kapal) {
        return res.status(404).json({ success: false, message: 'Kapal tidak ditemukan' });
      }

      res.json({
        success: true,
        data: {
          kapal: { id: kapal.id, namaKapal: kapal.namaKapal },
          storageData: kapal.storageData || []
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = storageDataController;
