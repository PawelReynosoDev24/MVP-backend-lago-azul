// src/routes/personaRoutes.js
// ============================================================================
// RUTAS: personas
// ============================================================================
// Igual patrón: el router solo enruta. El prefijo '/api/personas' va en app.js.
// ============================================================================

const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personaController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// GET /api/personas/listar → listar todas las personas activas
router.get('/listar', verificarToken, verificarPermiso('personas.listar'), personaController.listarPersonas);

// GET /api/personas/listar/:id → obtener una persona por su ID
router.get('/listar/:id', verificarToken, verificarPermiso('personas.ver'), personaController.obtenerPersona);

// POST /api/personas/crear → crear una persona (valida 1:1 con usuario)
router.post('/crear', verificarToken, verificarPermiso('personas.crear'), personaController.crearPersona);

// PUT /api/personas/actualizar/:id → actualizar datos personales
// (no cambia 'id_usuario' ni 'estado')
router.put('/actualizar/:id', verificarToken, verificarPermiso('personas.editar'), personaController.actualizarPersona);

// PATCH /api/personas/cambio/:id/estado → activar/desactivar
router.patch('/cambio/:id/estado', verificarToken, verificarPermiso('personas.estado'), personaController.cambiarEstadoPersona);

module.exports = router;