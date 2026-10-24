// src/models/Cubiculo.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Cubiculo extends Model {}

Cubiculo.init(
  {
    id_cubiculo: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_estanteria: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    fila: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    columna: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    capacidad_quintales: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Cubiculo',
    tableName: 'cubiculos',
  }
);

module.exports = Cubiculo;