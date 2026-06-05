const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// GET semua permissions dikelompokkan per role & kategori
exports.getAll = async (req, res) => {
  try {
    const rows = await sequelize.query(
      'SELECT * FROM role_permissions ORDER BY role, category, feature',
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET daftar role unik
exports.getRoles = async (req, res) => {
  try {
    const rows = await sequelize.query(
      'SELECT DISTINCT role FROM role_permissions ORDER BY role',
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows.map(r => r.role) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT update satu permission (toggle allowed)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowed } = req.body;
    await sequelize.query(
      'UPDATE role_permissions SET allowed = ? WHERE id = ?',
      { replacements: [allowed ? 1 : 0, id], type: QueryTypes.UPDATE }
    );
    res.json({ success: true, message: 'Permission updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST tambah fitur baru untuk semua role yang ada
exports.addFeature = async (req, res) => {
  try {
    const { category, feature, permissions } = req.body;
    // permissions: { admin: true, operator: false, supervisor: false, ... }
    if (!category || !feature || !permissions) {
      return res.status(400).json({ success: false, message: 'category, feature, dan permissions wajib diisi' });
    }

    const entries = Object.entries(permissions);
    for (const [role, allowed] of entries) {
      await sequelize.query(
        `INSERT INTO role_permissions (role, category, feature, allowed)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), category = VALUES(category)`,
        { replacements: [role, category, feature, allowed ? 1 : 0], type: QueryTypes.INSERT }
      );
    }
    res.json({ success: true, message: 'Fitur berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST tambah role baru (copy struktur fitur dari role lain, semua false)
exports.addRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, message: 'Nama role wajib diisi' });

    // Cek apakah role sudah ada
    const existing = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM role_permissions WHERE role = ?',
      { replacements: [role], type: QueryTypes.SELECT }
    );
    if (existing[0].cnt > 0) {
      return res.status(400).json({ success: false, message: `Role "${role}" sudah ada` });
    }

    // Ambil semua fitur unik dari role admin sebagai template
    const features = await sequelize.query(
      'SELECT DISTINCT category, feature FROM role_permissions WHERE role = "admin" ORDER BY category, feature',
      { type: QueryTypes.SELECT }
    );

    for (const { category, feature } of features) {
      await sequelize.query(
        'INSERT IGNORE INTO role_permissions (role, category, feature, allowed) VALUES (?, ?, ?, 0)',
        { replacements: [role, category, feature], type: QueryTypes.INSERT }
      );
    }

    res.json({ success: true, message: `Role "${role}" berhasil ditambahkan`, featuresAdded: features.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE hapus role beserta semua permissionnya
exports.deleteRole = async (req, res) => {
  try {
    const { role } = req.params;
    const protected_roles = ['admin', 'operator', 'supervisor'];
    if (protected_roles.includes(role)) {
      return res.status(400).json({ success: false, message: `Role "${role}" tidak dapat dihapus` });
    }
    await sequelize.query(
      'DELETE FROM role_permissions WHERE role = ?',
      { replacements: [role], type: QueryTypes.DELETE }
    );
    res.json({ success: true, message: `Role "${role}" berhasil dihapus` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE hapus fitur dari semua role
exports.deleteFeature = async (req, res) => {
  try {
    const { feature } = req.body;
    if (!feature) return res.status(400).json({ success: false, message: 'feature wajib diisi' });
    await sequelize.query(
      'DELETE FROM role_permissions WHERE feature = ?',
      { replacements: [feature], type: QueryTypes.DELETE }
    );
    res.json({ success: true, message: `Fitur "${feature}" berhasil dihapus dari semua role` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
