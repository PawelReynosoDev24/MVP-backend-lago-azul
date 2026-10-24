// src/models/Rol.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Rol extends Model {}

Rol.init(
  {
    id_rol: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    rol: {
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
    modelName: 'Rol',
    tableName: 'roles',
  }
);

module.exports = Rol;