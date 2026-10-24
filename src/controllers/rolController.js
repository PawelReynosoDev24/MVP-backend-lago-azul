// src/controllers/rolController.js
// ============================================================================
// CONTROLADOR: roles
// ============================================================================
// El controlador es el "cerebro" de cada petición HTTP. Recibe (req, res),
// valida la entrada, llama al modelo, y devuelve una respuesta al cliente.
//
// REGLA DE ORO: el controlador NO escribe SQL. Solo usa los métodos del
// modelo (Rol.findAll, Rol.create, etc.). El modelo es quien habla con MySQL.
//
// Convención de respuestas:
//   - 200 OK        → lectura exitosa (GET)
//   - 201 Created   → creación exitosa (POST)
//   - 400 Bad Request → datos inválidos del cliente
//   - 404 Not Found  → recurso inexistente
//   - 409 Conflict   → ya existe (ej. rol duplicado)
//   - 500 Internal   → error inesperado del servidor
// ============================================================================

const { Rol } = require('../models');

// ----------------------------------------------------------------------------
// LISTAR roles activos
// ----------------------------------------------------------------------------
// GET /api/roles
// Devuelve un array de roles con estado = 1 (soft delete: los inactivos
// tienen estado = 0 y NO se listan aquí).
// El 'try/catch' captura cualquier error inesperado (ej. MySQL caído) y
// responde con 500 en vez de dejar que Express explote con un stack trace.
const listarRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll({
      where: { estado: 1 },
      order: [['id_rol', 'ASC']],
    });
    res.json(roles);
  } catch (error) {
    console.error('Error al listar roles:', error);
    res.status(500).json({ error: 'Error al listar roles' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER un rol por ID
// ----------------------------------------------------------------------------
// GET /api/roles/:id
// ':id' llega como string (siempre). Lo convertimos a número para comparar
// con el id_rol (que es INT en la BD). Si no es un número válido, respondemos
// 400 en vez de dejar que MySQL falle con un error críptico.
const obtenerRol = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(rol);
  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({ error: 'Error al obtener rol' });
  }
};

// ----------------------------------------------------------------------------
// CREAR un rol
// ----------------------------------------------------------------------------
// POST /api/roles
// Body esperado: { "rol": "administrador" }
// Validamos que venga 'rol' y que sea string no vacío. Si no, 400.
// El modelo lanzará un error de UNIQUE si el nombre ya existe; lo capturamos
// y lo traducimos a 409 Conflict (más específico que un 500 genérico).
const crearRol = async (req, res) => {
  try {
    const { rol } = req.body;

    if (!rol || typeof rol !== 'string' || rol.trim() === '') {
      return res.status(400).json({ error: 'El campo "rol" es obligatorio' });
    }

    const nuevoRol = await Rol.create({ rol: rol.trim() });
    res.status(201).json(nuevoRol);
  } catch (error) {
    // Sequelize lanza 'SequelizeUniqueConstraintError' cuando viola un UNIQUE.
    // Detectarlo nos permite devolver 409 en vez de 500.
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El rol ya existe' });
    }
    console.error('Error al crear rol:', error);
    res.status(500).json({ error: 'Error al crear rol' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR un rol
// ----------------------------------------------------------------------------
// PUT /api/roles/:id
// Body esperado: { "rol": "nuevoNombre" }
// Solo cambia el nombre. NO toca 'estado' (para eso está cambiarEstado).
// Si el rol no existe → 404. Si el nuevo nombre ya existe → 409.
const actualizarRol = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { rol } = req.body;
    if (!rol || typeof rol !== 'string' || rol.trim() === '') {
      return res.status(400).json({ error: 'El campo "rol" es obligatorio' });
    }

    const rolExistente = await Rol.findByPk(id);
    if (!rolExistente) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // 'update' modifica el registro en la BD y actualiza la instancia en
    // memoria. Solo los campos indicados se tocan, el resto queda igual.
    await rolExistente.update({ rol: rol.trim() });
    res.json(rolExistente);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El rol ya existe' });
    }
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO (soft delete / reactivación)
// ----------------------------------------------------------------------------
// PATCH /api/roles/:id/estado
// Body esperado: { "estado": 0 } o { "estado": 1 }
// Usamos PATCH en vez de DELETE porque "eliminar" aquí es un cambio de
// estado lógico, no un borrado físico. Los usuarios que tenían ese rol
// conservan su FK intacta.
const cambiarEstadoRol = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { estado } = req.body;
    // Validamos estrictamente: solo 0 o 1 (TINYINT UNSIGNED en la BD).
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    await rol.update({ estado });
    res.json(rol);
  } catch (error) {
    console.error('Error al cambiar estado de rol:', error);
    res.status(500).json({ error: 'Error al cambiar estado de rol' });
  }
};

// === PERMISOS ===

const { Permiso } = require('../models'); // añade al require de arriba

// GET /api/roles/:id/permisos → ver permisos asignados a un rol
const obtenerPermisosDeRol = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const rol = await Rol.findByPk(id, {
      include: [{ model: Permiso, as: 'permisos', attributes: ['id_permiso', 'codigo', 'descripcion', 'modulo'] }],
    });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

    res.json({ id_rol: rol.id_rol, rol: rol.rol, permisos: rol.permisos });
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

// PUT /api/roles/:id/permisos → REEMPLAZAR los permisos de un rol
// Body esperado: { "permisos": [1, 2, 3] }  (ids de permiso)
const asignarPermisosARol = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const rol = await Rol.findByPk(id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

    const { permisos } = req.body;
    if (!Array.isArray(permisos)) {
      return res
        .status(400)
        .json({ error: 'El campo "permisos" debe ser un array de IDs' });
    }

    // Validar que TODOS los ids existan (evita FK errors)
    if (permisos.length > 0) {
      const existentes = await Permiso.findAll({
        where: { id_permiso: permisos },
        attributes: ['id_permiso'],
      });
      if (existentes.length !== permisos.length) {
        return res
          .status(400)
          .json({ error: 'Uno o más permisos no existen' });
      }
    }

    // 'setPermisos' reemplaza toda la asociación:
    //   1. DELETE de rol_permisos WHERE id_rol = id
    //   2. INSERT de las nuevas filas
    // Si pasas [] desasigna todos.
    await rol.setPermisos(permisos);

    // Devolver los permisos actuales
    const actualizados = await Rol.findByPk(id, {
      include: [{ model: Permiso, as: 'permisos', attributes: ['id_permiso', 'codigo'] }],
    });

    res.json({
      mensaje: 'Permisos actualizados',
      id_rol: id,
      permisos: actualizados.permisos,
    });
  } catch (error) {
    console.error('Error al asignar permisos:', error);
    res.status(500).json({ error: 'Error al asignar permisos' });
  }
};

module.exports = {
  listarRoles,
  obtenerRol,
  crearRol,
  actualizarRol,
  cambiarEstadoRol,
  obtenerPermisosDeRol,
  asignarPermisosARol,
};