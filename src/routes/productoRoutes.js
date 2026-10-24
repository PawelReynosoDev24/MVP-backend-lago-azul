// src/routes/productoRoutes.js
const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');
const { subirYProcesarFotoProducto } = require('../middlewares/uploadMiddleware');

router.get('/listar', verificarToken, verificarPermiso('productos.listar'), productoController.listarProductos);
router.get('/listar/:id', verificarToken, verificarPermiso('productos.ver'), productoController.obtenerProducto);

// Los dos de abajo llevan el middleware de foto.
// Si el request es multipart con archivo, se procesa; si no, pasa de largo.
router.post('/crear', verificarToken, verificarPermiso('productos.crear'), subirYProcesarFotoProducto, productoController.crearProducto);
router.put('/actualizar/:id', verificarToken, verificarPermiso('productos.editar'), subirYProcesarFotoProducto, productoController.actualizarProducto);

router.patch('/cambio/:id/estado', verificarToken, verificarPermiso('productos.estado'), productoController.cambiarEstadoProducto);

module.exports = router;