// src/controllers/unidadController.js
// ============================================================================
// CONTROLADOR: unidad_medidas
// ============================================================================
// Mismo patrón que roles: CRUD básico de un catálogo. Sin lógica de negocio
// (las conversiones y los cálculos de stock viven en otros controladores).
//
// Particularidad: 'unidad_medida' es UNIQUE. Si intentas crear o renombrar
// a un valor ya existente, MySQL lanza SequelizeUniqueConstraintError → 409.
// ============================================================================

const { UnidadMedida } = require('../models');

// ----------------------------------------------------------------------------
// LISTAR unidades activas
// ----------------------------------------------------------------------------
// GET /api/unidades/listar
// Podríamos paginar aquí si mañana hay decenas de unidades, pero para un
// catálogo pequeño un array plano es suficiente. Si luego crece, se añade
// getPagination fácilmente (ya tienes el helper global).
const listarUnidades = async (req, res) => {
  try {
    const unidades = await UnidadMedida.findAll({
      where: { estado: 1 },
      order: [['id_unidad', 'ASC']],
    });
    res.json(unidades);
  } catch (error) {
    console.error('Error al listar unidades:', error);
    res.status(500).json({ error: 'Error al listar unidades' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER unidad por ID
// ----------------------------------------------------------------------------
// GET /api/unidades/listar/:id
const obtenerUnidad = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const unidad = await UnidadMedida.findByPk(id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }
    res.json(unidad);
  } catch (error) {
    console.error('Error al obtener unidad:', error);
    res.status(500).json({ error: 'Error al obtener unidad' });
  }
};

// ----------------------------------------------------------------------------
// CREAR unidad
// ----------------------------------------------------------------------------
// POST /api/unidades/crear
// Body esperado: { "unidad_medida": "onza" }
const crearUnidad = async (req, res) => {
  try {
    const { unidad_medida } = req.body;

    if (!unidad_medida || typeof unidad_medida !== 'string' || unidad_medida.trim() === '') {
      return res
        .status(400)
        .json({ error: 'El campo "unidad_medida" es obligatorio' });
    }

    const nueva = await UnidadMedida.create({
      unidad_medida: unidad_medida.trim(),
    });
    res.status(201).json(nueva);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'La unidad de medida ya existe' });
    }
    console.error('Error al crear unidad:', error);
    res.status(500).json({ error: 'Error al crear unidad' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR unidad
// ----------------------------------------------------------------------------
// PUT /api/unidades/actualizar/:id
// Body esperado: { "unidad_medida": "onzas" }
const actualizarUnidad = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { unidad_medida } = req.body;
    if (!unidad_medida || typeof unidad_medida !== 'string' || unidad_medida.trim() === '') {
      return res
        .status(400)
        .json({ error: 'El campo "unidad_medida" es obligatorio' });
    }

    const unidad = await UnidadMedida.findByPk(id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    await unidad.update({ unidad_medida: unidad_medida.trim() });
    res.json(unidad);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'La unidad de medida ya existe' });
    }
    console.error('Error al actualizar unidad:', error);
    res.status(500).json({ error: 'Error al actualizar unidad' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO (soft delete / reactivación)
// ----------------------------------------------------------------------------
// PATCH /api/unidades/cambio/:id/estado
// Body esperado: { "estado": 0 } o { "estado": 1 }
//
// ⚠️ Cuando existan 'conversiones' y 'movimientos', desactivar una unidad
// NO rompe las FKs (los registros históricos conservan su id_unidad y
// siguen leyéndose). Simplemente la unidad deja de aparecer en los listados
// activos, evitando que se use en NUEVAS conversiones o movimientos.
const cambiarEstadoUnidad = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { estado } = req.body;
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const unidad = await UnidadMedida.findByPk(id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    await unidad.update({ estado });
    res.json(unidad);
  } catch (error) {
    console.error('Error al cambiar estado de unidad:', error);
    res.status(500).json({ error: 'Error al cambiar estado de unidad' });
  }
};

module.exports = {
  listarUnidades,
  obtenerUnidad,
  crearUnidad,
  actualizarUnidad,
  cambiarEstadoUnidad,
};