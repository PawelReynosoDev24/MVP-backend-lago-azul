// src/middlewares/permisoMiddleware.js
// ============================================================================
// MIDDLEWARE: verificación de permisos por código
// ============================================================================
// Fábrica de middlewares: recibe el código del permiso y devuelve una
// función middleware que verifica si el rol del usuario autenticado
// tiene ese permiso asignado en la BD.
//
// IMPORTANTE: requiere que 'verificarToken' haya corrido antes,
// porque depende de 'req.usuario.id_rol'.
// ============================================================================

const { Rol, Permiso } = require('../models');

const verificarPermiso = (codigoPermiso) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario || !req.usuario.id_rol) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      // Buscamos el rol del usuario e incluimos SOLO el permiso que nos
      // interesa. Si la asociación existe, 'rol' vendrá con datos.
      // Si no existe, 'rol' será null.
      const rol = await Rol.findByPk(req.usuario.id_rol, {
        include: [
          {
            model: Permiso,
            as: 'permisos',
            where: { codigo: codigoPermiso, estado: 1 },
            required: true,   // INNER JOIN → si no hay match, rol = null
            attributes: ['id_permiso'],
          },
        ],
      });

      if (!rol) {
        return res
          .status(403)
          .json({ error: `No tienes permiso para: ${codigoPermiso}` });
      }

      next();
    } catch (error) {
      console.error('Error al verificar permiso:', error);
      res.status(500).json({ error: 'Error al verificar permiso' });
    }
  };
};

module.exports = { verificarPermiso };