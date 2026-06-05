const express = require('express');
const router = express.Router();
const nahkodaController = require('../controllers/nahkodaController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', nahkodaController.getAllNahkoda);
router.post('/', nahkodaController.createNahkoda);
router.put('/:id', nahkodaController.updateNahkoda);
router.delete('/:id', nahkodaController.deleteNahkoda);

module.exports = router;