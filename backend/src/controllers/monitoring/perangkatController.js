const { Perangkat, Kapal, User } = require('../../models');
const { sequelize } = require('../../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

// Multer config untuk foto perangkat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/perangkat-photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `perangkat-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPG, PNG, WEBP yang diizinkan'));
    }
  }
});

const perangkatController = {
  // GET /api/perangkat - Get all perangkat
  async getAllPerangkat(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        jenis, 
        kondisi, 
        status, 
        kapalId,
        search 
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter berdasarkan jenis perangkat
      if (jenis && jenis !== 'all') {
        whereClause.jenisPerangkat = jenis;
      }

      // Filter berdasarkan kondisi
      if (kondisi && kondisi !== 'all') {
        whereClause.kondisi = kondisi;
      }

      // Filter berdasarkan status operasional
      if (status && status !== 'all') {
        whereClause.statusOperasional = status;
      }

      // Filter berdasarkan kapal
      if (kapalId && kapalId !== 'all') {
        whereClause.kapalId = kapalId === 'null' ? null : kapalId;
      }

      // Search berdasarkan nama perangkat atau merk
      if (search) {
        whereClause[Op.or] = [
          { namaPerangkat: { [Op.like]: `%${search}%` } },
          { merk: { [Op.like]: `%${search}%` } },
          { model: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Perangkat.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi'],
            required: false
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'nama', 'username'],
            required: false
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      // Transform data untuk response
      const perangkatData = rows.map(perangkat => ({
        ...perangkat.toJSON(),
        fotoUrl: perangkat.foto ? `/uploads/perangkat-photos/${perangkat.foto}` : null,
        hargaFormatted: perangkat.hargaPembelian ? 
          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(perangkat.hargaPembelian) : null
      }));

      res.json({
        success: true,
        data: perangkatData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('❌ Get all perangkat error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat data perangkat: ' + error.message
      });
    }
  },

  // GET /api/perangkat/:id - Get perangkat by ID
  async getPerangkatById(req, res) {
    try {
      const { id } = req.params;

      const perangkat = await Perangkat.findByPk(id, {
        include: [
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['id', 'namaKapal', 'nomorRegistrasi', 'tipeKapal'],
            required: false
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'nama', 'username'],
            required: false
          }
        ]
      });

      if (!perangkat) {
        return res.status(404).json({
          success: false,
          message: 'Perangkat tidak ditemukan'
        });
      }

      const perangkatData = {
        ...perangkat.toJSON(),
        fotoUrl: perangkat.foto ? `/uploads/perangkat-photos/${perangkat.foto}` : null,
        hargaFormatted: perangkat.hargaPembelian ? 
          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(perangkat.hargaPembelian) : null
      };

      res.json({
        success: true,
        data: perangkatData
      });
    } catch (error) {
      console.error('❌ Get perangkat by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat data perangkat: ' + error.message
      });
    }
  },

  // POST /api/perangkat - Create new perangkat
  async createPerangkat(req, res) {
    try {
      const {
        namaPerangkat,
        jenisPerangkat,
        merk,
        model,
        nomorSeri,
        tahunPembuatan,
        kondisi,
        statusOperasional,
        tanggalPembelian,
        hargaPembelian,
        spesifikasi,
        keterangan,
        kapalId
      } = req.body;

      // Validasi input
      if (!namaPerangkat || !jenisPerangkat) {
        return res.status(400).json({
          success: false,
          message: 'Nama perangkat dan jenis perangkat wajib diisi'
        });
      }

      // Parse spesifikasi jika berupa string JSON
      let parsedSpesifikasi = null;
      if (spesifikasi) {
        try {
          parsedSpesifikasi = typeof spesifikasi === 'string' ? JSON.parse(spesifikasi) : spesifikasi;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format spesifikasi tidak valid'
          });
        }
      }

      // Validasi kapal jika ada
      if (kapalId && kapalId !== 'null') {
        const kapal = await Kapal.findByPk(kapalId);
        if (!kapal) {
          return res.status(404).json({
            success: false,
            message: 'Kapal tidak ditemukan'
          });
        }
      }

      const perangkatData = {
        namaPerangkat,
        jenisPerangkat,
        merk: merk || null,
        model: model || null,
        nomorSeri: nomorSeri || null,
        tahunPembuatan: tahunPembuatan ? parseInt(tahunPembuatan) : null,
        kondisi: kondisi || 'baik',
        statusOperasional: statusOperasional || 'aktif',
        tanggalPembelian: tanggalPembelian || null,
        hargaPembelian: hargaPembelian ? parseFloat(hargaPembelian) : null,
        spesifikasi: parsedSpesifikasi,
        keterangan: keterangan || null,
        kapalId: (kapalId && kapalId !== 'null') ? parseInt(kapalId) : null,
        createdBy: req.user?.userId || null,
        foto: req.file ? req.file.filename : null
      };

      const perangkat = await Perangkat.create(perangkatData);

      res.status(201).json({
        success: true,
        message: 'Perangkat berhasil ditambahkan',
        data: {
          ...perangkat.toJSON(),
          fotoUrl: perangkat.foto ? `/uploads/perangkat-photos/${perangkat.foto}` : null
        }
      });
    } catch (error) {
      console.error('❌ Create perangkat error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menambahkan perangkat: ' + error.message
      });
    }
  },

  // PUT /api/perangkat/:id - Update perangkat
  async updatePerangkat(req, res) {
    try {
      const { id } = req.params;
      const {
        namaPerangkat,
        jenisPerangkat,
        merk,
        model,
        nomorSeri,
        tahunPembuatan,
        kondisi,
        statusOperasional,
        tanggalPembelian,
        hargaPembelian,
        spesifikasi,
        keterangan,
        kapalId
      } = req.body;

      const perangkat = await Perangkat.findByPk(id);
      if (!perangkat) {
        return res.status(404).json({
          success: false,
          message: 'Perangkat tidak ditemukan'
        });
      }

      // Parse spesifikasi jika berupa string JSON
      let parsedSpesifikasi = perangkat.spesifikasi;
      if (spesifikasi !== undefined) {
        try {
          parsedSpesifikasi = typeof spesifikasi === 'string' ? JSON.parse(spesifikasi) : spesifikasi;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format spesifikasi tidak valid'
          });
        }
      }

      // Validasi kapal jika ada
      if (kapalId && kapalId !== 'null') {
        const kapal = await Kapal.findByPk(kapalId);
        if (!kapal) {
          return res.status(404).json({
            success: false,
            message: 'Kapal tidak ditemukan'
          });
        }
      }

      // Handle foto update
      let fotoFilename = perangkat.foto;
      if (req.file) {
        // Delete old photo if exists
        if (perangkat.foto) {
          const oldPath = path.join(__dirname, '../../uploads/perangkat-photos', perangkat.foto);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        fotoFilename = req.file.filename;
      }

      const updateData = {
        namaPerangkat: namaPerangkat || perangkat.namaPerangkat,
        jenisPerangkat: jenisPerangkat || perangkat.jenisPerangkat,
        merk: merk !== undefined ? merk : perangkat.merk,
        model: model !== undefined ? model : perangkat.model,
        nomorSeri: nomorSeri !== undefined ? nomorSeri : perangkat.nomorSeri,
        tahunPembuatan: tahunPembuatan !== undefined ? (tahunPembuatan ? parseInt(tahunPembuatan) : null) : perangkat.tahunPembuatan,
        kondisi: kondisi || perangkat.kondisi,
        statusOperasional: statusOperasional || perangkat.statusOperasional,
        tanggalPembelian: tanggalPembelian !== undefined ? tanggalPembelian : perangkat.tanggalPembelian,
        hargaPembelian: hargaPembelian !== undefined ? (hargaPembelian ? parseFloat(hargaPembelian) : null) : perangkat.hargaPembelian,
        spesifikasi: parsedSpesifikasi,
        keterangan: keterangan !== undefined ? keterangan : perangkat.keterangan,
        kapalId: kapalId !== undefined ? ((kapalId && kapalId !== 'null') ? parseInt(kapalId) : null) : perangkat.kapalId,
        foto: fotoFilename
      };

      await perangkat.update(updateData);

      res.json({
        success: true,
        message: 'Perangkat berhasil diupdate',
        data: {
          ...perangkat.toJSON(),
          fotoUrl: perangkat.foto ? `/uploads/perangkat-photos/${perangkat.foto}` : null
        }
      });
    } catch (error) {
      console.error('❌ Update perangkat error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate perangkat: ' + error.message
      });
    }
  },

  // DELETE /api/perangkat/:id - Delete perangkat
  async deletePerangkat(req, res) {
    try {
      const { id } = req.params;

      const perangkat = await Perangkat.findByPk(id);
      if (!perangkat) {
        return res.status(404).json({
          success: false,
          message: 'Perangkat tidak ditemukan'
        });
      }

      // Delete photo file if exists
      if (perangkat.foto) {
        const photoPath = path.join(__dirname, '../../uploads/perangkat-photos', perangkat.foto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }

      await perangkat.destroy();

      res.json({
        success: true,
        message: 'Perangkat berhasil dihapus'
      });
    } catch (error) {
      console.error('❌ Delete perangkat error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus perangkat: ' + error.message
      });
    }
  },

  // GET /api/perangkat/statistics - Get perangkat statistics
  async getStatistics(req, res) {
    try {
      const totalPerangkat = await Perangkat.count();
      
      const byJenis = await Perangkat.findAll({
        attributes: [
          'jenisPerangkat',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['jenisPerangkat'],
        raw: true
      });

      const byKondisi = await Perangkat.findAll({
        attributes: [
          'kondisi',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['kondisi'],
        raw: true
      });

      const byStatus = await Perangkat.findAll({
        attributes: [
          'statusOperasional',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['statusOperasional'],
        raw: true
      });

      const perangkatTanpaKapal = await Perangkat.count({
        where: { kapalId: null }
      });

      res.json({
        success: true,
        data: {
          totalPerangkat,
          perangkatTanpaKapal,
          perangkatTerpasang: totalPerangkat - perangkatTanpaKapal,
          byJenis: byJenis.map(item => ({
            jenis: item.jenisPerangkat,
            count: parseInt(item.count)
          })),
          byKondisi: byKondisi.map(item => ({
            kondisi: item.kondisi,
            count: parseInt(item.count)
          })),
          byStatus: byStatus.map(item => ({
            status: item.statusOperasional,
            count: parseInt(item.count)
          }))
        }
      });
    } catch (error) {
      console.error('❌ Get perangkat statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat statistik perangkat: ' + error.message
      });
    }
  },

  // Middleware untuk upload foto
  uploadPhoto: upload.single('foto')
};

module.exports = perangkatController;