// src/controllers/authController.js
// ============================================================================
// CONTROLADOR: autenticación
// ============================================================================
// Solo tiene el login. Recibe usuario + contraseña, valida con bcrypt,
// firma un JWT y lo devuelve junto con los datos del usuario y la lista
// de permisos (el frontend la usa para mostrar/ocultar opciones de menú).
// ============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Rol, Permiso } = require('../models');

const login = async (req, res) => {
  try {
    const { usuario, contrasenia } = req.body;

    if (!usuario || !contrasenia) {
      return res
        .status(400)
        .json({ error: 'Usuario y contraseña son obligatorios' });
    }

    // Buscamos con el scope 'conPassword' porque NECESITAMOS el hash para
    // comparar. Incluimos el rol para tener su nombre en la respuesta.
    const user = await Usuario.scope('conPassword').findOne({
      where: { usuario },
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });

    // Por seguridad, respondemos el mismo error si el usuario no existe
    // o si la contraseña no coincide. Así no revelamos si un usuario existe.
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (user.estado !== 1) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // bcrypt.compare(plana, hash) → true/false
    const coincide = await bcrypt.compare(contrasenia, user.contrasenia);
    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // ---- Firmar el JWT ----
    // El payload NO debe llevar datos sensibles. Solo identificadores:
    // id_usuario (para saber quién) e id_rol (para permisos).
    // 'expiresIn: 8h' es razonable para un prototipo. En producción,
    // suele ser más corto (15min-1h) + refresh token.
    const token = jwt.sign(
      { id_usuario: user.id_usuario, id_rol: user.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // ---- Traer los permisos del rol (para el frontend) ----
    const permisos = await Permiso.findAll({
      include: [
        {
          model: Rol,
          as: 'roles',
          where: { id_rol: user.id_rol },
          attributes: [],   // no queremos los datos del rol aquí, solo filtrar
        },
      ],
      where: { estado: 1 },
      attributes: ['codigo'],
    });

    res.json({
      token,
      usuario: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        rol: user.rol,
      },
      permisos: permisos.map((p) => p.codigo),
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
};

// GET /api/auth/me
// El frontend lo usa al recargar la página: envía el token en el header
// y este endpoint devuelve el usuario + permisos actuales, o 401 si el
// token ya expiró. Así el frontend puede restaurar la sesión sin pedir
// credenciales otra vez.
const me = async (req, res) => {
  try {
    // req.usuario viene del middleware verificarToken
    const user = await Usuario.findByPk(req.usuario.id_usuario, {
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });

    // Verificación extra: si el usuario fue desactivado DESPUÉS de emitir
    // el token, no debería seguir "logueado". Sin este check, su token
    // seguiría funcionando hasta expirar.
    if (!user || user.estado !== 1) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    // Permisos actuales del rol (pueden haber cambiado desde el login)
    const permisos = await Permiso.findAll({
      include: [
        {
          model: Rol,
          as: 'roles',
          where: { id_rol: user.id_rol },
          attributes: [],
        },
      ],
      where: { estado: 1 },
      attributes: ['codigo'],
    });

    res.json({
      usuario: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        rol: user.rol,
      },
      permisos: permisos.map((p) => p.codigo),
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

module.exports = { login, me };