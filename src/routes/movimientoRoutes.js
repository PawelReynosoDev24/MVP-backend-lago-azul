// src/routes/movimientoRoutes.js
// ============================================================================
// RUTAS: inventario_movimientos
// ============================================================================
// Notar: NO hay PUT ni DELETE. Los movimientos son inmutables.
// Las correcciones se hacen con POST /ajuste.
// ============================================================================

const express = require('express');
const router = express.Router();
const movimientoController = require('../controllers/movimientoController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// Leer historial
router.get('/listar', verificarToken, verificarPermiso('movimientos.listar'), movimientoController.listarMovimientos);
router.get('/listar/:id', verificarToken, verificarPermiso('movimientos.ver'), movimientoController.obtenerMovimiento);

// Registrar ingreso/egreso normal (bodeguero / admin)
router.post('/ingreso', verificarToken, verificarPermiso('movimientos.crear'), movimientoController.crearIngreso);
router.post('/egreso', verificarToken, verificarPermiso('movimientos.crear'), movimientoController.crearEgreso);

// Corregir con ajuste (SOLO admin — permiso especial)
router.post('/ajuste', verificarToken, verificarPermiso('movimientos.corregir'), movimientoController.crearAjuste);

module.exports = router;