const { Router } = require('express');
const ctrl = require('../controllers/departments');

const router = Router();

router.get('/', ctrl.list);

module.exports = router;
