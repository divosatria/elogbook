const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/auth/rolePermissionController');
const { authenticate, authorize, ADMIN_ONLY, ALL_WEB } = require('../../middleware/auth/auth');

// Public: dipakai saat login untuk cek apakah role boleh akses web
router.get('/public-roles', ctrl.getRoles);

router.use(authenticate);

// Read: semua authenticated user boleh baca permissions
router.get('/',       ctrl.getAll);
router.get('/roles',  ctrl.getRoles);

// Write: admin only
router.put('/:id',          authorize(ADMIN_ONLY), ctrl.update);
router.post('/feature',     authorize(ADMIN_ONLY), ctrl.addFeature);
router.post('/role',        authorize(ADMIN_ONLY), ctrl.addRole);
router.delete('/role/:role',authorize(ADMIN_ONLY), ctrl.deleteRole);
router.delete('/feature',   authorize(ADMIN_ONLY), ctrl.deleteFeature);

module.exports = router;
