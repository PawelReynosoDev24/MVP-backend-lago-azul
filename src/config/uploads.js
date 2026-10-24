// src/config/uploads.js
// ============================================================================
// CONFIGURACIÓN DE UPLOADS
// ============================================================================
// Centraliza la ruta de la carpeta de imágenes. Se puede sobrescribir desde
// el .env con UPLOAD_DIR (ruta absoluta o relativa al proyecto).
// La carpeta se crea automáticamente si no existe.
// ============================================================================

const path = require('path');
const fs = require('fs');

// Si UPLOAD_DIR está en .env, úsalo (resuelto a absoluto).
// Si no, por defecto: <proyecto>/uploads (al mismo nivel que src/)
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

// Crear la carpeta si no existe (recursive: true crea padres también)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

module.exports = { UPLOAD_DIR };