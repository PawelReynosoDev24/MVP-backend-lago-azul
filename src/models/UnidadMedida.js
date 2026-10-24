// src/models/UnidadMedida.js
// ============================================================================
// MODELO: unidad_medidas
// ============================================================================
// Catálogo de unidades de medida (onza, botella, litro, galón, etc.).
// Más adelante, 'conversiones' e 'inventario_movimientos' referenciarán esta
// tabla por su id_unidad, pero esas asociaciones las declararemos cuando
// existan esos modelos.
// ============================================================================

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class UnidadMedida extends Model {}

UnidadMedida.init(
  {
    id_unidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    unidad_medida: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,   // refleja el UNIQUE que agregaste en MySQL
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'UnidadMedida',
    tableName: 'unidad_medidas',
  }
);

module.exports = UnidadMedida;