// src/middlewares/authMiddleware.js
// ============================================================================
// MIDDLEWARE: verificación de JWT
// ============================================================================
// Lee el header 'Authorization: Bearer <token>', verifica su firma y
// expiración, y deja los datos del payload en 'req.usuario' para que los
// siguientes middlewares/controladores los usen.
// ============================================================================

const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Formato esperado: "Bearer eyJhbGciOi..."
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 'verify' lanza excepción si la firma es inválida o el token expiró
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload = { id_usuario, id_rol, iat, exp }
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { verificarToken };