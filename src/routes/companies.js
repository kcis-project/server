const { Router } = require('express');
const ctrl = require('../controllers/companies');

const router = Router();

router.get('/search', ctrl.search);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

module.exports = router;
