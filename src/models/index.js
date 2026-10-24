// src/models/index.js
const sequelize = require('../config/db');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Persona = require('./Persona');
const UnidadMedida = require('./UnidadMedida');
const Producto = require('./Producto');
const Conversion = require('./Conversion');
const InventarioMovimiento = require('./InventarioMovimiento');
const Estanteria = require('./Estanteria');
const Cubiculo = require('./Cubiculo');
const UbicacionProducto = require('./UbicacionProducto');
const Permiso = require('./Permiso');

// ============================================================================
// ASOCIACIONES
// ============================================================================
// Nota: hasMany/belongsTo/hasOne NO tocan la BD. Solo le dicen a Sequelize
// cómo hacer JOINs y cómo precargar relaciones con 'include'.
// Las FKs reales ya están definidas en MySQL (las creaste con tu script SQL).
// ============================================================================

// Rol 1 ─── N Usuario (un rol tiene muchos usuarios)
Rol.hasMany(Usuario, { foreignKey: 'id_rol', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

// Usuario 1 ─── 1 Persona (un usuario tiene un perfil personal)
Usuario.hasOne(Persona, { foreignKey: 'id_usuario', as: 'persona' });
Persona.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// ===== NUEVA asociación N:M =====
// Rol N ─── N Permiso (a través de la tabla pivote 'rol_permisos')
Rol.belongsToMany(Permiso, {
  through: 'rol_permisos',
  foreignKey: 'id_rol',
  otherKey: 'id_permiso',
  as: 'permisos',
});
Permiso.belongsToMany(Rol, {
  through: 'rol_permisos',
  foreignKey: 'id_permiso',
  otherKey: 'id_rol',
  as: 'roles',
});

// ===== UnidadMedida: sin asociaciones aún =====
// Cuando creemos 'Conversiones' e 'InventarioMovimientos', añadiremos aquí:
//   UnidadMedida.hasMany(Conversion, { foreignKey: 'id_unidad', as: 'conversiones' });
//   Conversion.belongsTo(UnidadMedida, { foreignKey: 'id_unidad', as: 'unidad' });
//   (lo mismo para movimientos)

// ===== NUEVAS asociaciones: Conversion =====
// Producto 1 ─── N Conversion
Producto.hasMany(Conversion, { foreignKey: 'id_producto', as: 'conversiones' });
Conversion.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });

// UnidadMedida 1 ─── N Conversion
UnidadMedida.hasMany(Conversion, { foreignKey: 'id_unidad', as: 'conversiones' });
Conversion.belongsTo(UnidadMedida, { foreignKey: 'id_unidad', as: 'unidad' });

// ===== NUEVAS: InventarioMovimiento =====
Producto.hasMany(InventarioMovimiento, { foreignKey: 'id_producto', as: 'movimientos' });
InventarioMovimiento.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });

UnidadMedida.hasMany(InventarioMovimiento, { foreignKey: 'id_unidad', as: 'movimientos' });
InventarioMovimiento.belongsTo(UnidadMedida, { foreignKey: 'id_unidad', as: 'unidad' });

Usuario.hasMany(InventarioMovimiento, { foreignKey: 'id_usuario', as: 'movimientos' });
InventarioMovimiento.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// ===== NUEVAS ASOCIACIONES: Mapeo Físico (Bodega) =====

// Estanteria 1 ─── N Cubiculos
Estanteria.hasMany(Cubiculo, { foreignKey: 'id_estanteria', as: 'cubiculos' });
Cubiculo.belongsTo(Estanteria, { foreignKey: 'id_estanteria', as: 'estanteria' });

// Cubiculo 1 ─── N Ubicaciones (lo que hay dentro de un cubículo)
Cubiculo.hasMany(UbicacionProducto, { foreignKey: 'id_cubiculo', as: 'ubicaciones' });
UbicacionProducto.belongsTo(Cubiculo, { foreignKey: 'id_cubiculo', as: 'cubiculo' });

// Producto 1 ─── N Ubicaciones (en qué cubículos está un producto)
Producto.hasMany(UbicacionProducto, { foreignKey: 'id_producto', as: 'ubicaciones' });
UbicacionProducto.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Persona,
  Permiso,
  UnidadMedida,
  Producto,
  Conversion,
  InventarioMovimiento,
  Estanteria,
  Cubiculo,
  UbicacionProducto,
};