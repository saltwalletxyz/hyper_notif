"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alerts_controller_1 = require("../controllers/alerts.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const alertsController = new alerts_controller_1.AlertsController();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
router.post('/', (req, res) => alertsController.createAlert(req, res));
router.get('/', (req, res) => alertsController.getAlerts(req, res));
router.get('/stats', (req, res) => alertsController.getAlertStats(req, res));
router.get('/:id', (req, res) => alertsController.getAlert(req, res));
router.put('/:id', (req, res) => alertsController.updateAlert(req, res));
router.delete('/:id', (req, res) => alertsController.deleteAlert(req, res));
router.post('/:id/reset', (req, res) => alertsController.resetAlert(req, res));
exports.default = router;
