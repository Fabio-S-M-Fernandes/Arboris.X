const { Router } = require('express');
const {
  getAlerts,
  getHeatMap,
  getSensorById,
  getSensors,
  getSummary,
  getTrends,
  markAlertAsRead,
  markAllAlertsAsRead,
} = require('../controllers/dashboard.controller');

const router = Router();

router.get('/resumo', getSummary);
router.get('/tendencias', getTrends);
router.get('/sensores', getSensors);
router.get('/sensores/:id', getSensorById);
router.get('/alertas', getAlerts);
router.patch('/alertas/:id/lida', markAlertAsRead);
router.post('/alertas/marcar-todas-lidas', markAllAlertsAsRead);
router.get('/mapa-calor', getHeatMap);

module.exports = router;
