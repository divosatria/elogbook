const Nahkoda = require('../../models/vessel/Nahkoda');
const Kapal = require('../../models/vessel/Kapal');

exports.getAllNahkoda = async (req, res) => {
  try {
    const nahkoda = await Nahkoda.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json(nahkoda);
  } catch (error) {
    console.error('Error fetching nahkoda:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createNahkoda = async (req, res) => {
  try {
    const {
      nama,
      nik,
      noTelepon,
      alamat,
      tanggalLahir,
      jenisKelamin,
      pengalaman,
      sertifikat,
      foto
    } = req.body;
    
    const nahkoda = await Nahkoda.create({
      nama,
      nik,
      noTelepon,
      alamat,
      tanggalLahir,
      jenisKelamin,
      pengalaman: pengalaman || 0,
      sertifikat: sertifikat || [],
      foto,
      statusAktif: true
    });
    
    res.status(201).json(nahkoda);
  } catch (error) {
    console.error('Error creating nahkoda:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateNahkoda = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updated] = await Nahkoda.update(updateData, {
      where: { id },
      returning: true
    });
    
    if (updated === 0) {
      return res.status(404).json({ message: 'Nahkoda tidak ditemukan' });
    }
    
    const updatedNahkoda = await Nahkoda.findByPk(id);
    res.json(updatedNahkoda);
  } catch (error) {
    console.error('Error updating nahkoda:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteNahkoda = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Nahkoda.destroy({
      where: { id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Nahkoda tidak ditemukan' });
    }
    
    res.json({ message: 'Nahkoda berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting nahkoda:', error);
    res.status(400).json({ message: error.message });
  }
};