// src/middlewares/rateLimiter.js
// ============================================================================
// RATE LIMITING
// ============================================================================
// Limita el número de peticiones por IP en una ventana de tiempo.
// Su uso principal es en /api/auth/login para frenar ataques de fuerza bruta
// (probar miles de contraseñas por segundo).
// ============================================================================

const rateLimit = require('express-rate-limit');

// ---- Login ----
// Máximo 10 intentos por IP cada 15 minutos.
// Si se supera, responde 429 Too Many Requests hasta que pase la ventana.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // ventana: 15 minutos
  limit: 10,                     // máximo 10 peticiones por ventana por IP
  message: {
    error: 'Demasiados intentos de login. Espera 15 minutos.',
  },
  standardHeaders: true,         // envía header RateLimit-* con la info
  legacyHeaders: false,          // no envía headers X-RateLimit-* (obsoletos)
  // En local, todas las peticiones vienen de 127.0.0.1, así que el límite
  // aplica a tu propia máquina. En producción, cada IP de cliente tiene su
  // propio contador.
});

module.exports = { loginLimiter };