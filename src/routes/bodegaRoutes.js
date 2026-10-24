// src/routes/bodegaRoutes.js
const express = require('express');
const router = express.Router();
const bodegaController = require('../controllers/bodegaController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// Rutas de lectura (estanterías)
router.get('/estanterias', verificarToken, verificarPermiso('bodega.ver'), bodegaController.listarEstanterias);
router.get('/estanterias/:id', verificarToken, verificarPermiso('bodega.ver'), bodegaController.obtenerEstanteria);

// Rutas de creación/edición de estructura
router.post('/estanterias', verificarToken, verificarPermiso('bodega.editar'), bodegaController.crearEstanteria);
router.put('/estanterias/:id', verificarToken, verificarPermiso('bodega.editar'), bodegaController.actualizarEstanteria);
router.patch('/estanterias/:id/estado', verificarToken, verificarPermiso('bodega.editar'), bodegaController.cambiarEstadoEstanteria);

// Ruta para mover productos
router.post('/mover', verificarToken, verificarPermiso('bodega.editar'), bodegaController.moverProducto);

module.exports = router;