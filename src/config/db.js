// src/config/db.js
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Verificamos si estamos en producción (Render) o local
const isProduction = process.env.NODE_ENV === 'production';

const sequelizeConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true,
  },
  // Configuración del pool para evitar desconexiones
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  }
};

// Si estamos en producción (Aiven), activamos SSL
if (isProduction) {
  const caPath = path.join(__dirname, '..', '..', 'certs', 'ca.pem');
  
  if (fs.existsSync(caPath)) {
    sequelizeConfig.dialectOptions = {
      ssl: {
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true,
      },
    };
  } else {
    // A veces Aiven permite esto si no subimos el ca.pem por error
    sequelizeConfig.dialectOptions = { ssl: { require: true, rejectUnauthorized: false } };
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeConfig
);

module.exports = sequelize;