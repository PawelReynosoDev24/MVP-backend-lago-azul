// src/models/Producto.js
// ============================================================================
// MODELO: productos
// ============================================================================
// Solo el modelo por ahora. Su controlador y rutas vendrán después de
// 'conversiones' (porque el controlador de movimientos necesitará ambos).
// El modelo ya permite que 'Conversion' e 'InventarioMovimiento' declaren
// su FK y asociación en index.js.
// ============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Producto extends Model {}

Producto.init(
  {
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    producto: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    codigo: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
    foto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    color_hex: {
      type: DataTypes.STRING(7), // Formato #FFFFFF (7 caracteres)
      allowNull: true,
      defaultValue: '#CCCCCC',   // Gris por defecto si no se envía
    },
    stock_actual_onzas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Producto',
    tableName: 'productos',
  }
);

module.exports = Producto;