// src/controllers/productoController.js
// ============================================================================
// CONTROLADOR: productos
// ============================================================================
// El módulo más completo hasta ahora. Puntos clave:
//
// - 'producto' y 'foto' son opcionales (NULL si no se envían).
//   Si llega un string vacío en 'producto', se guarda como NULL para que
//   el UNIQUE permita varios productos sin nombre.
// - La foto se procesa con Sharp (middleware aparte) y aquí solo se guarda
//   el filename en la BD.
// - En 'crear' se pueden enviar las conversiones en el mismo request (campo
//   'conversiones' como JSON string). Todo se envuelve en una TRANSACCIÓN:
//   si algo falla, no queda producto huérfano ni archivo en disco.
// - En 'actualizar', si llega foto nueva, se borra la anterior del disco.
// - Listado con paginación + include de conversiones (para que el frontend
//   reciba todo de una sola vez).
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Producto, Conversion, UnidadMedida, sequelize } = require('../models');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { UPLOAD_DIR } = require('../config/uploads');

// Include reutilizable: cada producto con sus conversiones activas
const includeConversiones = [
  {
    model: Conversion,
    as: 'conversiones',
    where: { estado: 1 },
    required: false,
    include: [
      { model: UnidadMedida, as: 'unidad', attributes: ['id_unidad', 'unidad_medida'] },
    ],
  },
];

// Helper: borra un archivo del disco sin romper si ya no existe.
// Se usa para limpiar fotos huérfanas si una operación falla después de subirla.
const eliminarArchivo = (filename) => {
  if (!filename) return;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) { /* best effort */ }
  }
};

// ----------------------------------------------------------------------------
// LISTAR productos con paginación
// ----------------------------------------------------------------------------
// GET /api/productos/listar?page=1&limit=10
const listarProductos = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req, 10, 100);

    const { count, rows } = await Producto.findAndCountAll({
      where: { estado: 1 },
      include: includeConversiones,
      limit,
      offset,
      order: [['id_producto', 'ASC']],
      distinct: true,   // CRÍTICO con include: sin esto, count cuenta las filas de conversiones
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER producto por ID
// ----------------------------------------------------------------------------
// GET /api/productos/listar/:id
const obtenerProducto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const prod = await Producto.findByPk(id, { include: includeConversiones });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(prod);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// ----------------------------------------------------------------------------
// CREAR producto (con foto opcional y conversiones opcionales)
// ----------------------------------------------------------------------------
// POST /api/productos/crear
// multipart/form-data con:
//   - foto (archivo, opcional)
//   - codigo (string, obligatorio, max 8)
//   - producto (string, opcional)
//   - stock_actual_onzas (número, opcional, default 0)
//   - conversiones (JSON string, opcional): '[{"id_unidad":1,"factor_conversion":1600}, ...]'
const crearProducto = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { producto, codigo, stock_actual_onzas, conversiones, color_hex } = req.body;
    const foto = req.file ? req.file.filename : null;

    // ---- 1. Validaciones antes de tocar la BD ----
    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
      await t.rollback();
      eliminarArchivo(foto);
      return res.status(400).json({ error: 'El campo "codigo" es obligatorio' });
    }
    if (codigo.trim().length > 8) {
      await t.rollback();
      eliminarArchivo(foto);
      return res.status(400).json({ error: 'El código no puede tener más de 8 caracteres' });
    }

    let stock = 0;
    if (stock_actual_onzas !== undefined && stock_actual_onzas !== '') {
      stock = Number(stock_actual_onzas);
      if (!Number.isFinite(stock) || stock < 0) {
        await t.rollback();
        eliminarArchivo(foto);
        return res.status(400).json({ error: 'stock_actual_onzas debe ser >= 0' });
      }
    }

    // ---- 2. Parsear y validar conversiones (si vienen) ----
    let convs = [];
    if (conversiones) {
      try {
        convs = typeof conversiones === 'string' ? JSON.parse(conversiones) : conversiones;
      } catch (_) {
        await t.rollback();
        eliminarArchivo(foto);
        return res.status(400).json({ error: 'El campo "conversiones" no es JSON válido' });
      }
      if (!Array.isArray(convs)) {
        await t.rollback();
        eliminarArchivo(foto);
        return res.status(400).json({ error: '"conversiones" debe ser un array' });
      }

      // Validar cada conversión y verificar que la unidad exista
      const idsUnidad = [];
      for (const c of convs) {
        const factor = Number(c.factor_conversion);
        const idUnidad = Number(c.id_unidad);
        if (!Number.isFinite(factor) || factor <= 0) {
          await t.rollback();
          eliminarArchivo(foto);
          return res.status(400).json({ error: 'Cada conversión requiere factor_conversion > 0' });
        }
        if (!Number.isInteger(idUnidad)) {
          await t.rollback();
          eliminarArchivo(foto);
          return res.status(400).json({ error: 'Cada conversión requiere id_unidad entero' });
        }
        idsUnidad.push(idUnidad);
      }

      const unidadesExistentes = await UnidadMedida.findAll({
        where: { id_unidad: idsUnidad },
        attributes: ['id_unidad'],
        transaction: t,
      });
      if (unidadesExistentes.length !== new Set(idsUnidad).size) {
        await t.rollback();
        eliminarArchivo(foto);
        return res.status(400).json({ error: 'Una o más unidades no existen' });
      }
    }

    // ---- 3. Crear producto ----
    const productoFinal =
      producto && typeof producto === 'string' && producto.trim() !== ''
        ? producto.trim()
        : null;

    // NUEVA LÓGICA DE COLOR:
    // Prioriza el color enviado en el body (si el usuario lo cambió en el frontend)
    // Si no viene en el body, usa el que extrajo el middleware de la foto
    // Si no hay ninguno, usa el gris por defecto.
    const colorFinal = color_hex || req.file?.color_hex || '#CCCCCC';

    const nuevo = await Producto.create(
      {
        producto: productoFinal,
        codigo: codigo.trim(),
        foto,
        color_hex: colorFinal, // <-- Aquí usas la variable calculada
        stock_actual_onzas: stock,
      },
      { transaction: t }
    );

    // ---- 4. Crear conversiones si las hay ----
    if (convs.length > 0) {
      await Conversion.bulkCreate(
        convs.map((c) => ({
          factor_conversion: Number(c.factor_conversion),
          id_producto: nuevo.id_producto,
          id_unidad: Number(c.id_unidad),
        })),
        { transaction: t }
      );
    }

    await t.commit();

    // ---- 5. Re-consultar con include para devolver forma completa ----
    const creado = await Producto.findByPk(nuevo.id_producto, {
      include: includeConversiones,
    });
    res.status(201).json(creado);
  } catch (error) {
    await t.rollback();
    eliminarArchivo(req.file?.filename);

    if (error.name === 'SequelizeUniqueConstraintError') {
      const campo = error.fields?.codigo ? 'código' : 'nombre';
      return res.status(409).json({ error: `Ya existe un producto con ese ${campo}` });
    }
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR producto
// ----------------------------------------------------------------------------
// PUT /api/productos/actualizar/:id
// multipart/form-data con cualquier combinación de:
//   - foto (archivo, opcional: si viene, reemplaza la anterior)
//   - codigo, producto, stock_actual_onzas (opcionales)
// NO toca las conversiones (se gestionan en su propio endpoint).
const actualizarProducto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      eliminarArchivo(req.file?.filename);
      return res.status(400).json({ error: 'ID inválido' });
    }

    const prod = await Producto.findByPk(id);
    if (!prod) {
      eliminarArchivo(req.file?.filename);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { producto, codigo, stock_actual_onzas, color_hex } = req.body;
    const cambios = {};

    if (codigo !== undefined) {
      if (typeof codigo !== 'string' || codigo.trim() === '') {
        eliminarArchivo(req.file?.filename);
        return res.status(400).json({ error: '"codigo" no puede estar vacío' });
      }
      if (codigo.trim().length > 8) {
        eliminarArchivo(req.file?.filename);
        return res.status(400).json({ error: 'El código no puede tener más de 8 caracteres' });
      }
      cambios.codigo = codigo.trim();
    }

    if (producto !== undefined) {
      cambios.producto =
        producto && typeof producto === 'string' && producto.trim() !== ''
          ? producto.trim()
          : null;
    }

    // 1. Validar si el usuario envió un color manualmente desde el frontend
    if (color_hex !== undefined) {
      // Validación simple de formato hex
      if (typeof color_hex !== 'string' || !/^#[0-9A-F]{6}$/i.test(color_hex)) {
        eliminarArchivo(req.file?.filename);
        return res.status(400).json({ error: 'El color_hex debe tener formato #RRGGBB' });
      }
      cambios.color_hex = color_hex;
    } 
    // 2. Si no envió color manual, pero subió una foto nueva, usamos el color extraído
    else if (req.file && req.file.color_hex) {
      cambios.color_hex = req.file.color_hex;
    }

    if (stock_actual_onzas !== undefined && stock_actual_onzas !== '') {
      const s = Number(stock_actual_onzas);
      if (!Number.isFinite(s) || s < 0) {
        eliminarArchivo(req.file?.filename);
        return res.status(400).json({ error: 'stock_actual_onzas debe ser >= 0' });
      }
      cambios.stock_actual_onzas = s;
    }

    // Si viene foto nueva, borrar la anterior del disco
    if (req.file) {
      eliminarArchivo(prod.foto);
      cambios.foto = req.file.filename;
    }

    await prod.update(cambios);

    const actualizado = await Producto.findByPk(id, { include: includeConversiones });
    res.json(actualizado);
  } catch (error) {
    eliminarArchivo(req.file?.filename);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El código o nombre ya existe' });
    }
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO
// ----------------------------------------------------------------------------
// PATCH /api/productos/cambio/:id/estado
// Body: { "estado": 0 } o { "estado": 1 }
const cambiarEstadoProducto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { estado } = req.body;
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const prod = await Producto.findByPk(id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    await prod.update({ estado });

    const actualizado = await Producto.findByPk(id, { include: includeConversiones });
    res.json(actualizado);
  } catch (error) {
    console.error('Error al cambiar estado de producto:', error);
    res.status(500).json({ error: 'Error al cambiar estado de producto' });
  }
};

module.exports = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
};