// src/models/Usuario.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Usuario extends Model {}

Usuario.init(
  {
    id_usuario: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    contrasenia: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    id_rol: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios',
    // ----- SCOPES -----
    // Por defecto, NUNCA devolver 'contrasenia' en consultas.
    // Para el login, se usa Usuario.scope('conPassword').
    defaultScope: {
      attributes: { exclude: ['contrasenia'] },
    },
    scopes: {
      conPassword: {
        attributes: { include: ['contrasenia'] },
      },
    },
  }
);

module.exports = Usuario;