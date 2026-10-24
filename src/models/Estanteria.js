// src/models/Estanteria.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Estanteria extends Model {}

Estanteria.init(
  {
    id_estanteria: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(50),
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
    modelName: 'Estanteria',
    tableName: 'estanterias',
  }
);

module.exports = Estanteria;