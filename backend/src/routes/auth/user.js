const express = require('express');
const router = express.Router();
const userController = require('../../controllers/auth/userController');
const { authenticate, authorize, ADMIN_ONLY, ADMIN_OPERATOR } = require('../../middleware/auth/auth');

router.use(authenticate);

// Read: admin + operator
router.get('/', authorize(ADMIN_OPERATOR), userController.getAllUsers);
router.get('/:id', authorize(ADMIN_OPERATOR), userController.getUserById);

// Write: admin only
router.post('/', authorize(ADMIN_ONLY), userController.uploadMiddleware, userController.createUser);
router.put('/:id', authorize(ADMIN_ONLY), userController.uploadMiddleware, userController.updateUser);
router.patch('/:id/toggle-status', authorize(ADMIN_ONLY), userController.toggleUserStatus);
router.delete('/:id', authorize(ADMIN_ONLY), userController.deleteUser);

module.exports = router;
