// src/controllers/usuarioController.js
// ============================================================================
// CONTROLADOR: usuarios
// ============================================================================
// Aquí SÍ hay lógica que no puede vivir en el modelo: hashear contraseñas,
// validar que el rol exista, y manejar el conflicto de usuario duplicado.
//
// REGLAS:
//   - La contraseña NUNCA se guarda en texto plano. Siempre con bcrypt.
//   - La contraseña NUNCA se devuelve al cliente (el defaultScope del modelo
//     ya la excluye en las lecturas; aquí además re-consultamos tras
//     create/update para no filtrarla).
//   - El rol debe existir (FK). Lo validamos ANTES de crear, para dar un
//     error 400 claro en vez del error críptico de MySQL.
// ============================================================================

const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('../models');

// Coste del hash. 10 es el estándar razonable: ~100ms por hash.
// Subirlo (11, 12) = más seguro pero más lento. Para un prototipo, 10 sobra.
const SALT_ROUNDS = 10;

// ----------------------------------------------------------------------------
// LISTAR usuarios activos (con su rol)
// ----------------------------------------------------------------------------
// GET /api/usuarios/listar
// 'include' trae el rol asociado sin hacer 2 consultas (Sequelize hace el
// JOIN). El defaultScope ya excluye 'contrasenia', así que la respuesta
// es segura por defecto.
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      where: { estado: 1 },
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
      order: [['id_usuario', 'ASC']],
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER un usuario por ID
// ----------------------------------------------------------------------------
// GET /api/usuarios/listar/:id
const obtenerUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuario = await Usuario.findByPk(id, {
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// ----------------------------------------------------------------------------
// CREAR usuario
// ----------------------------------------------------------------------------
// POST /api/usuarios/crear
// Body esperado:
//   { "usuario": "admin", "contrasenia": "secreta123", "id_rol": 1 }
const crearUsuario = async (req, res) => {
  try {
    const { usuario, contrasenia, id_rol } = req.body;

    // ---- Validaciones básicas ----
    if (!usuario || typeof usuario !== 'string' || usuario.trim() === '') {
      return res.status(400).json({ error: 'El campo "usuario" es obligatorio' });
    }
    if (!contrasenia || typeof contrasenia !== 'string' || contrasenia.length < 6) {
      return res
        .status(400)
        .json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (!Number.isInteger(id_rol)) {
      return res.status(400).json({ error: 'El campo "id_rol" es obligatorio y debe ser entero' });
    }

    // ---- Verificar que el rol exista (evita error FK de MySQL) ----
    const rolExiste = await Rol.findByPk(id_rol);
    if (!rolExiste) {
      return res.status(400).json({ error: 'El rol indicado no existe' });
    }

    // ---- Hashear la contraseña ----
    // 'bcrypt.hash' genera un salt aleatorio y devuelve el hash completo
    // (que incluye el salt embebido). Nunca guardamos el salt por separado.
    const hash = await bcrypt.hash(contrasenia, SALT_ROUNDS);

    // ---- Crear el usuario ----
    const nuevo = await Usuario.create({
      usuario: usuario.trim(),
      contrasenia: hash,
      id_rol,
    });

    // Re-consultamos para devolver la forma "limpia" (sin contrasenia) y
    // con el rol cargado. El defaultScope se aplica en findByPk, pero NO en
    // el objeto que devuelve create() (ese conserva lo que le pasamos).
    const creado = await Usuario.findByPk(nuevo.id_usuario, {
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });
    res.status(201).json(creado);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR usuario
// ----------------------------------------------------------------------------
// PUT /api/usuarios/actualizar/:id
// Body esperado (contrasenia es OPCIONAL):
//   { "usuario": "admin2", "id_rol": 2 }
//   { "usuario": "admin2", "id_rol": 2, "contrasenia": "nueva123" }
// - Si 'contrasenia' viene, se hashea y se actualiza.
// - Si no viene, se conserva la actual. Esto es MUY útil: no obliga a
//   cambiar la contraseña cada vez que se edita el usuario.
const actualizarUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuarioExistente = await Usuario.findByPk(id);
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { usuario, contrasenia, id_rol } = req.body;

    if (!usuario || typeof usuario !== 'string' || usuario.trim() === '') {
      return res.status(400).json({ error: 'El campo "usuario" es obligatorio' });
    }
    if (!Number.isInteger(id_rol)) {
      return res.status(400).json({ error: 'El campo "id_rol" es obligatorio y debe ser entero' });
    }

    const rolExiste = await Rol.findByPk(id_rol);
    if (!rolExiste) {
      return res.status(400).json({ error: 'El rol indicado no existe' });
    }

    // Construimos el objeto de cambios dinámicamente
    const cambios = { usuario: usuario.trim(), id_rol };
    if (contrasenia !== undefined) {
      if (typeof contrasenia !== 'string' || contrasenia.length < 6) {
        return res
          .status(400)
          .json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }
      cambios.contrasenia = await bcrypt.hash(contrasenia, SALT_ROUNDS);
    }

    await usuarioExistente.update(cambios);

    // Re-consultamos para no devolver la contraseña recién hasheada
    const actualizado = await Usuario.findByPk(id, {
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });
    res.json(actualizado);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO (soft delete / reactivación)
// ----------------------------------------------------------------------------
// PATCH /api/usuarios/cambio/:id/estado
// Body esperado: { "estado": 0 } o { "estado": 1 }
const cambiarEstadoUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { estado } = req.body;
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.update({ estado });
    // Re-consultamos para incluir el rol y excluir contrasenia
    const actualizado = await Usuario.findByPk(id, {
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] }],
    });
    res.json(actualizado);
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado de usuario' });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
};