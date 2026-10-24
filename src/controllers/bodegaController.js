// src/controllers/bodegaController.js
// ============================================================================
// CONTROLADOR: bodega (Estanterías y Cubículos)
// ============================================================================
// Maneja la estructura física donde se guardan los productos.
// 
// Puntos clave:
// 1. Al crear una estantería, se generan automáticamente sus cubículos
//    basados en una cuadrícula (filas x columnas).
// 2. La función 'moverProducto' maneja el traslado físico de stock de un
//    cubículo a otro, validando capacidades y existencias.
// ============================================================================

const { 
  Estanteria, 
  Cubiculo, 
  UbicacionProducto, 
  Producto, 
  sequelize 
} = require('../models');

// Include reutilizable: trae la estantería con sus cubículos y lo que hay dentro de ellos
const includeCompleto = [
  {
    model: Cubiculo,
    as: 'cubiculos',
    where: { estado: 1 },
    required: false,
    include: [
      {
        model: UbicacionProducto,
        as: 'ubicaciones',
        include: [{ model: Producto, as: 'producto', attributes: ['id_producto', 'codigo', 'producto', 'color_hex', 'foto'] }]
      }
    ]
  }
];

// ----------------------------------------------------------------------------
// LISTAR estanterías activas (con toda su cuadrícula y productos)
// ----------------------------------------------------------------------------
// GET /api/bodega/estanterias
const listarEstanterias = async (req, res) => {
  try {
    const estanterias = await Estanteria.findAll({
      where: { estado: 1 },
      include: includeCompleto,
      order: [
        ['id_estanteria', 'ASC'],
        [{ model: Cubiculo, as: 'cubiculos' }, 'fila', 'ASC'],
        [{ model: Cubiculo, as: 'cubiculos' }, 'columna', 'ASC']
      ]
    });
    res.json(estanterias);
  } catch (error) {
    console.error('Error al listar estanterías:', error);
    res.status(500).json({ error: 'Error al listar estanterías' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER una estantería por ID
// ----------------------------------------------------------------------------
// GET /api/bodega/estanterias/:id
const obtenerEstanteria = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const est = await Estanteria.findByPk(id, { include: includeCompleto });
    if (!est) return res.status(404).json({ error: 'Estantería no encontrada' });
    
    res.json(est);
  } catch (error) {
    console.error('Error al obtener estantería:', error);
    res.status(500).json({ error: 'Error al obtener estantería' });
  }
};

// ----------------------------------------------------------------------------
// CREAR estantería (y generar sus cubículos)
// ----------------------------------------------------------------------------
// POST /api/bodega/estanterias
// Body: { "nombre": "Estante 1", "filas": 3, "columnas": 4, "capacidad_por_cubiculo": 4.5 }
const crearEstanteria = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nombre, filas, columnas, capacidad_por_cubiculo } = req.body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      await t.rollback();
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!Number.isInteger(filas) || filas <= 0 || !Number.isInteger(columnas) || columnas <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Filas y columnas deben ser enteros mayores a 0' });
    }
    const capacidad = Number(capacidad_por_cubiculo);
    if (!Number.isFinite(capacidad) || capacidad <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'La capacidad debe ser mayor a 0' });
    }

    // 1. Crear la estantería
    const nuevaEst = await Estanteria.create({ nombre: nombre.trim() }, { transaction: t });

    // 2. Generar la matriz de cubículos
    const cubiculosData = [];
    for (let f = 1; f <= filas; f++) {
      for (let c = 1; c <= columnas; c++) {
        cubiculosData.push({
          id_estanteria: nuevaEst.id_estanteria,
          fila: f,
          columna: c,
          capacidad_quintales: capacidad
        });
      }
    }

    // 3. Insertar todos los cubículos de golpe
    await Cubiculo.bulkCreate(cubiculosData, { transaction: t });

    await t.commit();

    // Devolver la estantería completa recién creada
    const creada = await Estanteria.findByPk(nuevaEst.id_estanteria, { include: includeCompleto });
    res.status(201).json(creada);
  } catch (error) {
    await t.rollback();
    console.error('Error al crear estantería:', error);
    res.status(500).json({ error: 'Error al crear estantería' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR estantería (solo el nombre)
// ----------------------------------------------------------------------------
// PUT /api/bodega/estanterias/:id
const actualizarEstanteria = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { nombre } = req.body;
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const est = await Estanteria.findByPk(id);
    if (!est) return res.status(404).json({ error: 'Estantería no encontrada' });

    await est.update({ nombre: nombre.trim() });
    
    const actualizada = await Estanteria.findByPk(id, { include: includeCompleto });
    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar estantería:', error);
    res.status(500).json({ error: 'Error al actualizar estantería' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO ESTANTERÍA (soft delete)
// ----------------------------------------------------------------------------
// PATCH /api/bodega/estanterias/:id/estado
const cambiarEstadoEstanteria = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;
    
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (estado !== 0 && estado !== 1) return res.status(400).json({ error: 'Estado debe ser 0 o 1' });

    const est = await Estanteria.findByPk(id);
    if (!est) return res.status(404).json({ error: 'Estantería no encontrada' });

    await est.update({ estado });
    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (error) {
    console.error('Error al cambiar estado de estantería:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

// ----------------------------------------------------------------------------
// MOVER PRODUCTO ENTRE CUBÍCULOS (o asignarlo por primera vez)
// ----------------------------------------------------------------------------
// POST /api/bodega/mover
// Body: { 
//   "id_producto": 1, 
//   "id_cubiculo_origen": 5,   // Puede ser null si es una asignación inicial
//   "id_cubiculo_destino": 10, 
//   "cantidad_quintales": 1.5 
// }
const moverProducto = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id_producto, id_cubiculo_origen, id_cubiculo_destino, cantidad_quintales } = req.body;
    const cantidadMover = Number(cantidad_quintales);

    // Validaciones básicas
    if (!Number.isInteger(id_producto) || !Number.isInteger(id_cubiculo_destino)) {
      await t.rollback();
      return res.status(400).json({ error: 'id_producto e id_cubiculo_destino son obligatorios' });
    }
    if (!Number.isFinite(cantidadMover) || cantidadMover <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'cantidad_quintales debe ser mayor a 0' });
    }

    // 1. Validar que el producto exista
    const producto = await Producto.findByPk(id_producto, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // 2. Si hay origen, validar que tenga suficiente producto
    if (id_cubiculo_origen) {
      const origen = await UbicacionProducto.findOne({
        where: { id_cubiculo: id_cubiculo_origen, id_producto },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!origen) {
        await t.rollback();
        return res.status(400).json({ error: 'El producto no está en el cubículo de origen' });
      }
      if (Number(origen.cantidad_quintales) < cantidadMover) {
        await t.rollback();
        return res.status(400).json({ error: `Solo hay ${origen.cantidad_quintales} quintales en el origen` });
      }

      // Restar del origen
      const nuevaCantOrigen = Number(origen.cantidad_quintales) - cantidadMover;
      if (nuevaCantOrigen === 0) {
        await origen.destroy({ transaction: t }); // Si queda en 0, borramos la fila
      } else {
        await origen.update({ cantidad_quintales: nuevaCantOrigen }, { transaction: t });
      }
    }

    // 3. Validar capacidad en el destino
    const destinoCubiculo = await Cubiculo.findByPk(id_cubiculo_destino, { transaction: t });
    if (!destinoCubiculo) {
      await t.rollback();
      return res.status(404).json({ error: 'Cubículo destino no encontrado' });
    }

    // Obtener todo lo que hay actualmente en el cubículo destino
    const ubicacionesDestino = await UbicacionProducto.findAll({
      where: { id_cubiculo: id_cubiculo_destino },
      transaction: t
    });
    
    // --- NUEVA VALIDACIÓN: MÁXIMO 3 COLORES/PRODUCTOS DISTINTOS ---
    const productosYaEnDestino = ubicacionesDestino.map(u => u.id_producto);
    const yaExisteElProducto = productosYaEnDestino.includes(id_producto);
    
    if (!yaExisteElProducto && productosYaEnDestino.length >= 3) {
      
      // 1. PRIMERO consultamos los códigos (usando la transacción viva)
      const productosEnDestino = await Producto.findAll({
        where: { id_producto: productosYaEnDestino },
        attributes: ['codigo'],
        transaction: t 
      });
      const codigos = productosEnDestino.map(p => p.codigo).join(', ');

      // 2. DESPUÉS hacemos el rollback
      await t.rollback();
      
      // 3. Retornamos el error
      return res.status(400).json({ 
        error: `El cubículo ya tiene el máximo de 3 colores permitidos (${codigos}). Debes vaciar o mover uno antes de ingresar otro.` 
      });
    }

    // 4. Sumar al destino
    const ubicacionDestino = await UbicacionProducto.findOne({
      where: { id_cubiculo: id_cubiculo_destino, id_producto },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (ubicacionDestino) {
      await ubicacionDestino.update(
        { cantidad_quintales: Number(ubicacionDestino.cantidad_quintales) + cantidadMover },
        { transaction: t }
      );
    } else {
      await UbicacionProducto.create({
        id_cubiculo: id_cubiculo_destino,
        id_producto,
        cantidad_quintales: cantidadMover
      }, { transaction: t });
    }

    await t.commit();
    res.json({ mensaje: 'Producto movido exitosamente' });
  } catch (error) {
    await t.rollback();
    console.error('Error al mover producto:', error);
    res.status(500).json({ error: 'Error al mover producto' });
  }
};

module.exports = {
  listarEstanterias,
  obtenerEstanteria,
  crearEstanteria,
  actualizarEstanteria,
  cambiarEstadoEstanteria,
  moverProducto,
};