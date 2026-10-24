// src/models/UbicacionProducto.js
// ============================================================================
// MODELO: ubicaciones_productos
// ============================================================================
// Esta tabla es la que dice "En el cubiculo X está el producto Y con Z cantidad".
// Es una tabla intermedia que conecta la estructura física (cubiculos) con
// el inventario lógico (productos).
// ============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class UbicacionProducto extends Model {}

UbicacionProducto.init(
  {
    id_ubicacion: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_cubiculo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    cantidad_quintales: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  },
  {
    sequelize,
    modelName: 'UbicacionProducto',
    tableName: 'ubicaciones_productos',
  }
);

module.exports = UbicacionProducto;