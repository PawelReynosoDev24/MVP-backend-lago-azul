// src/routes/rolRoutes.js
// ============================================================================
// RUTAS: roles
// ============================================================================
// El router SOLO conecta "método HTTP + ruta" con "función del controlador".
// NO tiene lógica. NO valida. NO consulta la BD. Solo enruta.
//
// El prefijo ('/api/roles') va en app.js, NO aquí. Si lo repites aquí,
// terminarías con URLs como /api/roles/api/roles (error clásico).
// ============================================================================

const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rolController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// GET /api/roles → listar todos los roles activos
router.get('/listar', verificarToken, verificarPermiso('roles.listar'), rolController.listarRoles);

// GET /api/roles/:id → obtener un rol por su ID
router.get('/listar/:id', verificarToken, verificarPermiso('roles.listar'), rolController.obtenerRol);

// POST /api/roles → crear un nuevo rol
router.post('/crear', verificarToken, verificarPermiso('roles.crear'), rolController.crearRol);

// PUT /api/roles/:id → actualizar el nombre de un rol
router.put('/actualizar/:id', verificarToken, verificarPermiso('roles.editar'), rolController.actualizarRol);

// PATCH /api/roles/:id/estado → cambiar estado (0 = inactivo, 1 = activo)
// Ojo: esta ruta es MÁS ESPECÍFICA que '/:id'. Express evalúa las rutas
// en orden, así que 'PUT /:id' no choca con 'PATCH /:id/estado' porque
// el método HTTP es distinto (PUT vs PATCH).
router.patch('/cambio/:id/estado', verificarToken, verificarPermiso('roles.estado'), rolController.cambiarEstadoRol);

// === PERMISOS ===
router.get('/listar/:id/permisos', verificarToken, verificarPermiso('roles.asignar_permisos'), rolController.obtenerPermisosDeRol);
router.put('/asignar/:id/permisos', verificarToken, verificarPermiso('roles.asignar_permisos'), rolController.asignarPermisosARol);

module.exports = router;