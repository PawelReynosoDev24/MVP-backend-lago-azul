// src/models/Permiso.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Permiso extends Model {}

Permiso.init(
  {
    id_permiso: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    modulo: {
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
    modelName: 'Permiso',
    tableName: 'permisos',
  }
);

module.exports = Permiso;