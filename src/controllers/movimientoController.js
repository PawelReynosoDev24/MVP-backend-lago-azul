// src/controllers/movimientoController.js
// ============================================================================
// CONTROLADOR: inventario_movimientos
// ============================================================================
// Este es el módulo que JUNTA todo:
//   - Recibe { id_producto, id_unidad, cantidad_movimiento }
//   - Busca la conversión (producto, unidad) para obtener el factor
//   - Calcula las onzas aplicando el signo según el tipo
//   - Actualiza el stock del producto
//   - Registra el movimiento en el historial
//
// TODO va dentro de una TRANSACCIÓN con LOCK en el producto:
//   - Si falla la creación del movimiento, el stock no se modifica.
//   - El LOCK evita race conditions (dos ventas simultáneas del mismo producto).
//
// REGLAS DE NEGOCIO:
//   1. ingreso: suma stock. cantidad > 0.
//   2. egreso:  resta stock. cantidad > 0. Requiere stock suficiente.
//   3. ajuste:  suma o resta. cantidad positiva = suma, negativa = resta.
//               Solo lo puede hacer quien tenga 'movimientos.corregir'.
//
// Los movimientos son INMUTABLES: no hay PUT ni DELETE.
// Las correcciones se hacen creando un nuevo 'ajuste'.
// ============================================================================

const {
  InventarioMovimiento,
  Producto,
  UnidadMedida,
  Conversion,
  Usuario,
  Estanteria,           // <-- 1 sola vez
  Cubiculo,             // <-- 1 sola vez
  UbicacionProducto,    // <-- 1 sola vez
  sequelize,
} = require('../models');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

// Constante: 1 Quintal = 1600 Onzas (según tus conversiones)
const ONZAS_POR_QUINTAL = 1600;

// Include reutilizable para las respuestas
const includeCompleto = [
  { model: Producto, as: 'producto', attributes: ['id_producto', 'producto', 'codigo', 'color_hex', 'foto', 'stock_actual_onzas'] },
  { model: UnidadMedida, as: 'unidad', attributes: ['id_unidad', 'unidad_medida'] },
  { model: Usuario, as: 'usuario', attributes: ['id_usuario', 'usuario'] },
];

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

// Busca la conversión para (producto, unidad) y devuelve el factor como número.
// Lanza un error legible si no existe o está inactiva.
const obtenerFactor = async (idProducto, idUnidad, t) => {
  const conversion = await Conversion.findOne({
    where: { id_producto: idProducto, id_unidad: idUnidad, estado: 1 },
    transaction: t,
  });
  if (!conversion) {
    throw new Error(
      'No hay conversión definida para ese producto y unidad. Configúrala primero en /api/conversiones.'
    );
  }
  return Number(conversion.factor_conversion);
};

// Actualiza el stock del producto sumando 'delta' (puede ser negativo).
// Bloquea la fila con LOCK.UPDATE para evitar race conditions.
// Valida que el stock no quede negativo.
const aplicarDeltaStock = async (idProducto, delta, t) => {
  const producto = await Producto.findByPk(idProducto, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!producto) throw new Error('El producto no existe');

  const stockActual = Number(producto.stock_actual_onzas);
  const nuevoStock = stockActual + delta;

  if (nuevoStock < 0) {
    throw new Error(
      `Stock insuficiente. Stock actual: ${stockActual.toFixed(2)} oz, ` +
      `intentas restar ${Math.abs(delta).toFixed(2)} oz.`
    );
  }

  await producto.update({ stock_actual_onzas: nuevoStock }, { transaction: t });
  return nuevoStock;
};

// ----------------------------------------------------------------------------
// NUEVO HELPER: Actualizar el inventario físico (Cubículos)
// ----------------------------------------------------------------------------
const actualizarInventarioFisico = async (id_cubiculo, id_producto, cantidad_quintales, signo, t) => {
  // 1. Bloquear el cubículo para evitar que dos personas muevan al mismo tiempo
  const cubiculo = await Cubiculo.findByPk(id_cubiculo, { transaction: t, lock: t.LOCK.UPDATE });
  if (!cubiculo) throw new Error('El cubículo indicado no existe');

  // 2. Obtener lo que hay en el cubículo
  const ubicaciones = await UbicacionProducto.findAll({ where: { id_cubiculo }, transaction: t });
  const ubicacionActual = ubicaciones.find(u => u.id_producto === id_producto);

  if (signo > 0) {
    // --- ES UN INGRESO ---
    // Validar máximo 3 colores
    if (!ubicacionActual && ubicaciones.length >= 3) {
      throw new Error('El cubículo ya tiene el máximo de 3 colores permitidos.');
    }

    // Validar capacidad en quintales
    const totalActual = ubicaciones.reduce((sum, u) => sum + Number(u.cantidad_quintales), 0);
    if (totalActual + cantidad_quintales > Number(cubiculo.capacidad_quintales)) {
      throw new Error(
        `Capacidad excedida. El cubículo admite ${cubiculo.capacidad_quintales} QQ y ya tiene ${totalActual} QQ.`
      );
    }

    // Sumar al cubículo
    if (ubicacionActual) {
      await ubicacionActual.update(
        { cantidad_quintales: Number(ubicacionActual.cantidad_quintales) + cantidad_quintales },
        { transaction: t }
      );
    } else {
      await UbicacionProducto.create(
        { id_cubiculo, id_producto, cantidad_quintales },
        { transaction: t }
      );
    }
  } else {
    // --- ES UN EGRESO O AJUSTE NEGATIVO ---
    if (!ubicacionActual) {
      throw new Error('El producto no se encuentra en el cubículo indicado para restar stock.');
    }
    if (Number(ubicacionActual.cantidad_quintales) < cantidad_quintales) {
      throw new Error(
        `Solo hay ${ubicacionActual.cantidad_quintales} QQ de este producto en el cubículo, intentas sacar ${cantidad_quintales} QQ.`
      );
    }

    // Restar del cubículo
    const nuevaCant = Number(ubicacionActual.cantidad_quintales) - cantidad_quintales;
    if (nuevaCant === 0) {
      await ubicacionActual.destroy({ transaction: t });
    } else {
      await ubicacionActual.update({ cantidad_quintales: nuevaCant }, { transaction: t });
    }
  }
};

// ----------------------------------------------------------------------------
// NÚCLEO COMÚN DE MOVIMIENTOS
// ----------------------------------------------------------------------------
const crearMovimientoBase = async (req, res, tipo, signo, cantidadAbsoluta) => {
  const t = await sequelize.transaction();
  try {
    // AÑADIMOS id_cubiculo A LA DESTRUCTURACIÓN
    const { id_producto, id_unidad, id_cubiculo } = req.body;
    const id_usuario = req.usuario.id_usuario;

    // ---- 1. Validaciones básicas ----
    if (!Number.isInteger(id_producto)) {
      await t.rollback();
      return res.status(400).json({ error: 'id_producto es obligatorio (entero)' });
    }
    if (!Number.isInteger(id_unidad)) {
      await t.rollback();
      return res.status(400).json({ error: 'id_unidad es obligatorio (entero)' });
    }
    if (!Number.isFinite(cantidadAbsoluta) || cantidadAbsoluta <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'cantidad_movimiento debe ser mayor a 0' });
    }

    // ---- 2. Verificar unidad ----
    const unidad = await UnidadMedida.findByPk(id_unidad, { transaction: t });
    if (!unidad || unidad.estado !== 1) {
      await t.rollback();
      return res.status(400).json({ error: 'La unidad no existe o está inactiva' });
    }

    // ---- 3. Obtener factor ----
    const factor = await obtenerFactor(id_producto, id_unidad, t);

    // ---- 4. Calcular cantidades ----
    const cantidadFirmada = signo * cantidadAbsoluta;
    const onzasFirmadas = cantidadFirmada * factor;

    // ---- 5. Aplicar al stock global (lógico) ----
    const nuevoStock = await aplicarDeltaStock(id_producto, onzasFirmadas, t);

    // ---- 6. NUEVO: Aplicar al stock físico (cubículo) si se envió ----
    if (id_cubiculo) {
      // Convertimos las onzas a quintales
      const cantidadEnQuintales = Math.abs(onzasFirmadas) / ONZAS_POR_QUINTAL;
      await actualizarInventarioFisico(id_cubiculo, id_producto, cantidadEnQuintales, signo, t);
    }

    // ---- 7. Registrar movimiento histórico ----
    const mov = await InventarioMovimiento.create(
      {
        tipo_movimiento: tipo,
        cantidad_movimiento: cantidadFirmada,
        cantidad_onzas: onzasFirmadas,
        fecha_hora: new Date(),
        id_producto,
        id_unidad,
        id_usuario,
      },
      { transaction: t }
    );

    await t.commit();

    const creado = await InventarioMovimiento.findByPk(mov.id_movimiento, {
      include: includeCompleto,
    });

    res.status(201).json({
      movimiento: creado,
      stock_resultante: nuevoStock,
    });
  } catch (error) {
    await t.rollback();
    console.error(`Error al crear movimiento ${tipo}:`, error);

    // Capturamos los errores de negocio (lógicos o físicos)
    if (
      error.message.includes('No hay conversión') ||
      error.message.includes('Stock insuficiente') ||
      error.message.includes('El producto no existe') ||
      error.message.includes('cubículo') ||
      error.message.includes('Capacidad excedida')
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno al crear movimiento' });
  }
};

// ============================================================================
// ENDPOINTS
// ============================================================================

// ----------------------------------------------------------------------------
// LISTAR (con filtros opcionales)
// ----------------------------------------------------------------------------
// GET /api/movimientos/listar?page=1&limit=20&id_producto=1&tipo_movimiento=egreso
const listarMovimientos = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req, 20, 100);

    const where = { estado: 1 };
    if (req.query.id_producto) {
      const idp = Number(req.query.id_producto);
      if (!Number.isNaN(idp)) where.id_producto = idp;
    }
    if (req.query.tipo_movimiento) {
      where.tipo_movimiento = req.query.tipo_movimiento;
    }

    const { count, rows } = await InventarioMovimiento.findAndCountAll({
      where,
      include: includeCompleto,
      limit,
      offset,
      order: [['fecha_hora', 'DESC'], ['id_movimiento', 'DESC']],
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    console.error('Error al listar movimientos:', error);
    res.status(500).json({ error: 'Error al listar movimientos' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER uno por ID
// ----------------------------------------------------------------------------
// GET /api/movimientos/listar/:id
const obtenerMovimiento = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const mov = await InventarioMovimiento.findByPk(id, { include: includeCompleto });
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(mov);
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    res.status(500).json({ error: 'Error al obtener movimiento' });
  }
};

// ----------------------------------------------------------------------------
// INGRESO (bodeguero / admin)
// ----------------------------------------------------------------------------
// POST /api/movimientos/ingreso
// Body: { "id_producto": 1, "id_unidad": 3, "cantidad_movimiento": 5 }
// Ejemplo: ingreso 5 libras del producto 1
const crearIngreso = async (req, res) => {
  const cantidad = Number(req.body.cantidad_movimiento);
  return crearMovimientoBase(req, res, 'ingreso', +1, cantidad);
};

// ----------------------------------------------------------------------------
// EGRESO (bodeguero / admin)
// ----------------------------------------------------------------------------
// POST /api/movimientos/egreso
// Body: { "id_producto": 1, "id_unidad": 2, "cantidad_movimiento": 7 }
// Ejemplo: egreso 7 paquetes (válida que haya stock suficiente)
const crearEgreso = async (req, res) => {
  const cantidad = Number(req.body.cantidad_movimiento);
  return crearMovimientoBase(req, res, 'egreso', -1, cantidad);
};

// ----------------------------------------------------------------------------
// AJUSTE (solo admin con 'movimientos.corregir')
// ----------------------------------------------------------------------------
// POST /api/movimientos/ajuste
// Body: { "id_producto": 1, "id_unidad": 3, "cantidad_movimiento": -2 }
//   cantidad positiva → suma stock (corrige "vendí de menos")
//   cantidad negativa → resta stock (corrige "vendí de más")
//   cantidad 0 → inválido (no es un ajuste)
const crearAjuste = async (req, res) => {
  const cantidad = Number(req.body.cantidad_movimiento);
  const id_producto = req.body.id_producto;
  const id_unidad = req.body.id_unidad;
  const id_estanteria = req.body.id_estanteria; // NUEVO: Recibimos la estantería

  if (!Number.isFinite(cantidad) || cantidad === 0) {
    return res.status(400).json({ error: 'La cantidad debe ser distinto de 0.' });
  }

  // 1. Convertimos la cantidad a quintales
  const conversion = await Conversion.findOne({ 
    where: { id_producto, id_unidad } 
  });
  const factor = conversion ? Number(conversion.factor_conversion) : 1;
  let quintalesAjuste = Math.abs((cantidad * factor) / 1600); 
  
  const t = await sequelize.transaction();
  try {
    // 2. Configuramos la búsqueda (Global o por Estantería específica)
    const queryOptions = {
      include: [{
        model: Cubiculo,
        as: 'cubiculos',
        where: { estado: 1 },
        required: false,
        include: [{ model: UbicacionProducto, as: 'ubicaciones' }]
      }],
      transaction: t
    };

    // Si eligen una estantería específica, la filtramos
    if (id_estanteria) {
      queryOptions.where = { id_estanteria: Number(id_estanteria) };
    }

    const estanterias = await Estanteria.findAll(queryOptions);
    const todosLosCubiculos = estanterias.flatMap(e => e.cubiculos);

    if (todosLosCubiculos.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'No se encontraron cubículos disponibles en la estantería seleccionada.' });
    }

    if (cantidad > 0) {
      // --- LÓGICA DE SUMAR (BARRIDO POSITIVO) ---
      let capacidadTotalDisponible = 0;
      
      todosLosCubiculos.forEach(cub => {
        const ocupado = cub.ubicaciones.reduce((sum, u) => sum + Number(u.cantidad_quintales), 0);
        const espacio = Number(cub.capacidad_quintales) - ocupado;
        const tieneEsteProducto = cub.ubicaciones.some(u => u.id_producto === id_producto);
        const coloresDistintos = new Set(cub.ubicaciones.map(u => u.id_producto)).size;
        
        if (tieneEsteProducto || coloresDistintos < 3) {
          capacidadTotalDisponible += espacio;
        }
      });

      if (capacidadTotalDisponible < quintalesAjuste) {
        await t.rollback();
        const ubicacionTexto = id_estanteria ? 'en la estantería seleccionada' : 'en toda la bodega';
        return res.status(400).json({ error: `No hay suficiente espacio ${ubicacionTexto}. Necesitas ${quintalesAjuste} QQ y solo hay ${capacidadTotalDisponible} QQ disponibles.` });
      }

      // Ordenamos los cubículos: primero los que ya tienen el producto
      todosLosCubiculos.sort((a, b) => {
        const aTiene = a.ubicaciones.some(u => u.id_producto === id_producto) ? 1 : 0;
        const bTiene = b.ubicaciones.some(u => u.id_producto === id_producto) ? 1 : 0;
        return bTiene - aTiene;
      });

      for (const cub of todosLosCubiculos) {
        if (quintalesAjuste <= 0) break;

        const ubicacionProducto = cub.ubicaciones.find(u => u.id_producto === id_producto);
        const coloresDistintos = new Set(cub.ubicaciones.map(u => u.id_producto)).size;
        
        if (!ubicacionProducto && coloresDistintos >= 3) continue;

        const ocupado = cub.ubicaciones.reduce((sum, u) => sum + Number(u.cantidad_quintales), 0);
        const espacio = Number(cub.capacidad_quintales) - ocupado;

        if (espacio > 0) {
          const aMeter = Math.min(espacio, quintalesAjuste);
          if (ubicacionProducto) {
            await ubicacionProducto.update({ cantidad_quintales: Number(ubicacionProducto.cantidad_quintales) + aMeter }, { transaction: t });
          } else {
            await UbicacionProducto.create({ id_cubiculo: cub.id_cubiculo, id_producto, cantidad_quintales: aMeter }, { transaction: t });
          }
          quintalesAjuste -= aMeter;
        }
      }

    } else {
      // --- LÓGICA DE RESTAR (BARRIDO NEGATIVO) ---
      // Filtramos las ubicaciones solo de los cubículos permitidos
      const idsCubiculosPermitidos = todosLosCubiculos.map(c => c.id_cubiculo);
      
      const ubicaciones = await UbicacionProducto.findAll({
        where: { 
          id_producto,
          id_cubiculo: idsCubiculosPermitidos // <-- Solo de la estantería elegida
        },
        order: [['cantidad_quintales', 'DESC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const totalDisponible = ubicaciones.reduce((sum, u) => sum + Number(u.cantidad_quintales), 0);
      if (totalDisponible < quintalesAjuste) {
        await t.rollback();
        const ubicacionTexto = id_estanteria ? 'en esta estantería' : 'en toda la bodega';
        return res.status(400).json({ error: `No hay suficiente stock físico ${ubicacionTexto}. Hay ${totalDisponible} QQ disponibles, pero intentas restar ${quintalesAjuste} QQ.` });
      }

      for (const ubicacion of ubicaciones) {
        if (quintalesAjuste <= 0) break;
        const cantidadEnCubiculo = Number(ubicacion.cantidad_quintales);
        
        if (cantidadEnCubiculo >= quintalesAjuste) {
          await ubicacion.update({ cantidad_quintales: cantidadEnCubiculo - quintalesAjuste }, { transaction: t });
          quintalesAjuste = 0;
        } else {
          await ubicacion.update({ cantidad_quintales: 0 }, { transaction: t });
          quintalesAjuste -= cantidadEnCubiculo;
        }
      }
    }

    // Actualizar stock global y registrar historial
    const stockActual = await Producto.findByPk(id_producto, { transaction: t, lock: t.LOCK.UPDATE });
    const nuevoStock = Number(stockActual.stock_actual_onzas) + (cantidad * factor);
    await stockActual.update({ stock_actual_onzas: nuevoStock }, { transaction: t });

    await InventarioMovimiento.create({
      tipo_movimiento: 'ajuste',
      cantidad_movimiento: cantidad,
      cantidad_onzas: cantidad * factor,
      id_producto,
      id_unidad,
      id_usuario: req.usuario.id_usuario,
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ mensaje: 'Ajuste aplicado correctamente' });

  } catch (error) {
    await t.rollback();
    console.error('Error en ajuste:', error);
    res.status(500).json({ error: 'Error al aplicar el ajuste' });
  }
};

module.exports = {
  listarMovimientos,
  obtenerMovimiento,
  crearIngreso,
  crearEgreso,
  crearAjuste,
};