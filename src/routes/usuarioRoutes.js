// src/routes/usuarioRoutes.js
// ============================================================================
// RUTAS: usuarios
// ============================================================================
// Mismo patrón que rolRoutes: el router solo enruta, el prefijo va en app.js.
// ============================================================================

const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// GET /api/usuarios/listar → listar todos los usuarios activos (con su rol)
router.get('/listar', verificarToken, verificarPermiso('usuarios.listar'), usuarioController.listarUsuarios);

// GET /api/usuarios/listar/:id → obtener un usuario por su ID
router.get('/listar/:id', verificarToken, verificarPermiso('usuarios.ver'), usuarioController.obtenerUsuario);

// POST /api/usuarios/crear → crear un usuario (hashea la contraseña)
router.post('/crear', verificarToken, verificarPermiso('usuarios.crear'), usuarioController.crearUsuario);

// PUT /api/usuarios/actualizar/:id → actualizar un usuario
// (contrasenia es opcional; si no se envía, se conserva la actual)
router.put('/actualizar/:id', verificarToken, verificarPermiso('usuarios.editar'), usuarioController.actualizarUsuario);

// PATCH /api/usuarios/cambio/:id/estado → activar/desactivar
router.patch('/cambio/:id/estado', verificarToken, verificarPermiso('usuarios.estado'), usuarioController.cambiarEstadoUsuario);

module.exports = router;