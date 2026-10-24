// src/models/Conversion.js
// ============================================================================
// MODELO: conversiones
// ============================================================================
// Cada fila dice: "para el producto X, 1 unidad Y equivale a N onzas".
// El factor_conversion está en onzas (la unidad base del stock).
//
// Ejemplo para un producto de hilo:
//   (producto=1, unidad=quintal, factor=1600)
//   (producto=1, unidad=paquete, factor=80)
//   (producto=1, unidad=libra,   factor=16)
//   (producto=1, unidad=onza,    factor=1)
//
// UNIQUE (id_producto, id_unidad) garantiza una sola fila por combinación.
// ============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Conversion extends Model {}

Conversion.init(
  {
    id_conversion: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    factor_conversion: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    id_unidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Conversion',
    tableName: 'conversiones',
  }
);

module.exports = Conversion;