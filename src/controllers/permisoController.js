// src/controllers/permisoController.js
const { Permiso } = require('../models');

// GET /api/permisos/listar → catálogo completo (para que el frontend
// muestre los checkboxes de "qué puede hacer este rol")
const listarPermisos = async (req, res) => {
  try {
    const permisos = await Permiso.findAll({
      where: { estado: 1 },
      order: [['modulo', 'ASC'], ['codigo', 'ASC']],
    });
    res.json(permisos);
  } catch (error) {
    console.error('Error al listar permisos:', error);
    res.status(500).json({ error: 'Error al listar permisos' });
  }
};

module.exports = { listarPermisos };