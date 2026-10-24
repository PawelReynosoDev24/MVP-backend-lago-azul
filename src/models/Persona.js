// src/models/Persona.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Persona extends Model {}

Persona.init(
  {
    id_persona: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    dpi: {
      type: DataTypes.STRING(13),
      allowNull: false,
      unique: true,
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    correo_electronico: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    direccion_domicilio: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    estado: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    id_usuario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Persona',
    tableName: 'personas',
  }
);

module.exports = Persona;