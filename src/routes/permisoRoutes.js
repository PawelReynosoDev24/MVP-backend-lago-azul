const express = require('express');
const router = express.Router();
const permisoController = require('../controllers/permisoController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/permisoMiddleware');

// GET /api/permisos/listar → catálogo completo de permisos
router.get('/listar', verificarToken, verificarPermiso('roles.asignar_permisos'), permisoController.listarPermisos);

module.exports = router;