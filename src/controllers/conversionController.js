// src/controllers/conversionController.js
// ============================================================================
// CONTROLADOR: conversiones
// ============================================================================
// Catálogo: por cada producto, cuántas onzas representa 1 unidad.
// Todas las operaciones validan que el producto y la unidad existan.
// El UNIQUE (producto, unidad) se traduce a 409 si intentas duplicar.
// ============================================================================

const { Conversion, Producto, UnidadMedida } = require('../models');

// Include reutilizable: siempre queremos ver producto y unidad juntos
const includeCompleto = [
  { model: Producto, as: 'producto', attributes: ['id_producto', 'producto', 'codigo'] },
  { model: UnidadMedida, as: 'unidad', attributes: ['id_unidad', 'unidad_medida'] },
];

// ----------------------------------------------------------------------------
// LISTAR conversiones activas (con producto y unidad)
// ----------------------------------------------------------------------------
// GET /api/conversiones/listar
// Soporta filtro opcional: ?id_producto=1  (para ver solo las de un producto)
const listarConversiones = async (req, res) => {
  try {
    const where = { estado: 1 };
    if (req.query.id_producto) {
      const idp = Number(req.query.id_producto);
      if (!Number.isNaN(idp)) where.id_producto = idp;
    }

    const conversiones = await Conversion.findAll({
      where,
      include: includeCompleto,
      order: [['id_producto', 'ASC'], ['id_unidad', 'ASC']],
    });
    res.json(conversiones);
  } catch (error) {
    console.error('Error al listar conversiones:', error);
    res.status(500).json({ error: 'Error al listar conversiones' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER conversión por ID
// ----------------------------------------------------------------------------
// GET /api/conversiones/listar/:id
const obtenerConversion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const conv = await Conversion.findByPk(id, { include: includeCompleto });
    if (!conv) return res.status(404).json({ error: 'Conversión no encontrada' });
    res.json(conv);
  } catch (error) {
    console.error('Error al obtener conversión:', error);
    res.status(500).json({ error: 'Error al obtener conversión' });
  }
};

// ----------------------------------------------------------------------------
// CREAR conversión
// ----------------------------------------------------------------------------
// POST /api/conversiones/crear
// Body: { "factor_conversion": 1600, "id_producto": 1, "id_unidad": 1 }
const crearConversion = async (req, res) => {
  try {
    const { factor_conversion, id_producto, id_unidad } = req.body;

    // --- Validaciones ---
    const factor = Number(factor_conversion);
    if (!Number.isFinite(factor) || factor <= 0) {
      return res
        .status(400)
        .json({ error: 'El factor_conversion debe ser un número mayor a 0' });
    }
    if (!Number.isInteger(id_producto)) {
      return res.status(400).json({ error: 'id_producto es obligatorio (entero)' });
    }
    if (!Number.isInteger(id_unidad)) {
      return res.status(400).json({ error: 'id_unidad es obligatorio (entero)' });
    }

    // --- Verificar FKs (producto y unidad deben existir) ---
    const [productoExiste, unidadExiste] = await Promise.all([
      Producto.findByPk(id_producto),
      UnidadMedida.findByPk(id_unidad),
    ]);
    if (!productoExiste) {
      return res.status(400).json({ error: 'El producto indicado no existe' });
    }
    if (!unidadExiste) {
      return res.status(400).json({ error: 'La unidad indicada no existe' });
    }

    const nueva = await Conversion.create({
      factor_conversion: factor,
      id_producto,
      id_unidad,
    });

    // Re-consultamos con include para devolver la forma completa
    const creada = await Conversion.findByPk(nueva.id_conversion, {
      include: includeCompleto,
    });
    res.status(201).json(creada);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res
        .status(409)
        .json({ error: 'Ya existe una conversión para ese producto y unidad' });
    }
    console.error('Error al crear conversión:', error);
    res.status(500).json({ error: 'Error al crear conversión' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR factor
// ----------------------------------------------------------------------------
// PUT /api/conversiones/actualizar/:id
// Body: { "factor_conversion": 1600.50 }
// NO permite cambiar id_producto ni id_unidad: si necesitas otra combinación,
// creas una nueva y desactivas la anterior. Esto mantiene la trazabilidad.
const actualizarConversion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const conv = await Conversion.findByPk(id);
    if (!conv) return res.status(404).json({ error: 'Conversión no encontrada' });

    const { factor_conversion } = req.body;
    const factor = Number(factor_conversion);
    if (!Number.isFinite(factor) || factor <= 0) {
      return res
        .status(400)
        .json({ error: 'El factor_conversion debe ser un número mayor a 0' });
    }

    await conv.update({ factor_conversion: factor });

    const actualizada = await Conversion.findByPk(id, { include: includeCompleto });
    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar conversión:', error);
    res.status(500).json({ error: 'Error al actualizar conversión' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO
// ----------------------------------------------------------------------------
// PATCH /api/conversiones/cambio/:id/estado
// Body: { "estado": 0 } o { "estado": 1 }
// Desactivar una conversión NO rompe movimientos históricos (ellos ya
// guardaron cantidad_onzas con el factor vigente en su momento).
const cambiarEstadoConversion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { estado } = req.body;
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const conv = await Conversion.findByPk(id);
    if (!conv) return res.status(404).json({ error: 'Conversión no encontrada' });

    await conv.update({ estado });

    const actualizada = await Conversion.findByPk(id, { include: includeCompleto });
    res.json(actualizada);
  } catch (error) {
    console.error('Error al cambiar estado de conversión:', error);
    res.status(500).json({ error: 'Error al cambiar estado de conversión' });
  }
};

module.exports = {
  listarConversiones,
  obtenerConversion,
  crearConversion,
  actualizarConversion,
  cambiarEstadoConversion,
};