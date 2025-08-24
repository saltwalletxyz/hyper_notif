import { Router } from 'express';
import { AlertsController } from '../controllers/alerts.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const alertsController = new AlertsController();

// All routes require authentication
router.use(authenticateToken);

router.post('/', (req, res) => alertsController.createAlert(req, res));
router.get('/', (req, res) => alertsController.getAlerts(req, res));
router.get('/stats', (req, res) => alertsController.getAlertStats(req, res));
router.get('/:id', (req, res) => alertsController.getAlert(req, res));
router.put('/:id', (req, res) => alertsController.updateAlert(req, res));
router.delete('/:id', (req, res) => alertsController.deleteAlert(req, res));
router.post('/:id/reset', (req, res) => alertsController.resetAlert(req, res));

export default router;