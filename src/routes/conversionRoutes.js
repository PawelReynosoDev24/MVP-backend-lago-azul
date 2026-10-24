// src/routes/conversionRoutes.js
const express = require('express');
const router = express.Router();
const conversionController = require('../controllers/conversionController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

router.get('/listar', verificarToken, verificarPermiso('conversiones.listar'), conversionController.listarConversiones);
router.get('/listar/:id', verificarToken, verificarPermiso('conversiones.ver'), conversionController.obtenerConversion);
router.post('/crear', verificarToken, verificarPermiso('conversiones.crear'), conversionController.crearConversion);
router.put('/actualizar/:id', verificarToken, verificarPermiso('conversiones.editar'), conversionController.actualizarConversion);
router.patch('/cambio/:id/estado', verificarToken, verificarPermiso('conversiones.estado'), conversionController.cambiarEstadoConversion);

module.exports = router;