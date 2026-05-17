const { Router } = require('express');
const ctrl = require('../controllers/companies');

const router = Router();

router.post('/companies', ctrl.create);
router.put('/companies/:id', ctrl.update);
router.delete('/companies/:id', ctrl.remove);
router.get('/companies/fetch', ctrl.fetchExternal);

module.exports = router;
