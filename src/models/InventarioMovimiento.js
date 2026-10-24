// src/models/InventarioMovimiento.js
// ============================================================================
// MODELO: inventario_movimientos
// ============================================================================
// Registro histórico append-only de cambios de stock.
// NUNCA se edita ni se borra. Las correcciones se hacen con nuevos
// movimientos de tipo 'ajuste'.
//
// Convención de signo (el "libro contable" del stock):
//   ingreso  → cantidad_onzas POSITIVA (suma stock)
//   egreso   → cantidad_onzas NEGATIVA (resta stock)
//   ajuste   → cantidad_onzas positiva o negativa según la corrección
//
// Propiedad importante: SUM(cantidad_onzas) de un producto = stock actual.
// ============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class InventarioMovimiento extends Model {}

InventarioMovimiento.init(
  {
    id_movimiento: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    tipo_movimiento: {
      type: DataTypes.STRING(10),
      allowNull: false,
      // Valores válidos: 'ingreso', 'egreso', 'ajuste'
      validate: {
        isIn: {
          args: [['ingreso', 'egreso', 'ajuste']],
          msg: 'tipo_movimiento debe ser ingreso, egreso o ajuste',
        },
      },
    },
    cantidad_movimiento: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    cantidad_onzas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    fecha_hora: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    id_unidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    id_usuario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'InventarioMovimiento',
    tableName: 'inventario_movimientos',
  }
);

module.exports = InventarioMovimiento;