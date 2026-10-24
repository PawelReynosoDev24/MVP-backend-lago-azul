// src/routes/unidadRoutes.js
// ============================================================================
// RUTAS: unidad_medidas
// ============================================================================
// Mismo patrón RPC que los demás módulos, PERO con los middlewares de
// autenticación y permisos aplicados en cada ruta.
//
// Cada ruta exige:
//   1. verificarToken: token JWT válido (401 si no)
//   2. verificarPermiso('unidades.xxx'): el rol tiene ese permiso (403 si no)
// ============================================================================

const express = require('express');
const router = express.Router();
const unidadController = require('../controllers/unidadController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// GET /api/unidades/listar → listar todas las unidades activas
router.get(
  '/listar',
  verificarToken,
  verificarPermiso('unidades.listar'),
  unidadController.listarUnidades
);

// GET /api/unidades/listar/:id → obtener una unidad por ID
router.get(
  '/listar/:id',
  verificarToken,
  verificarPermiso('unidades.ver'),
  unidadController.obtenerUnidad
);

// POST /api/unidades/crear → crear unidad
router.post(
  '/crear',
  verificarToken,
  verificarPermiso('unidades.crear'),
  unidadController.crearUnidad
);

// PUT /api/unidades/actualizar/:id → actualizar nombre
router.put(
  '/actualizar/:id',
  verificarToken,
  verificarPermiso('unidades.editar'),
  unidadController.actualizarUnidad
);

// PATCH /api/unidades/cambio/:id/estado → activar/desactivar
router.patch(
  '/cambio/:id/estado',
  verificarToken,
  verificarPermiso('unidades.estado'),
  unidadController.cambiarEstadoUnidad
);

module.exports = router;