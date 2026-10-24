// src/controllers/personaController.js
// ============================================================================
// CONTROLADOR: personas
// ============================================================================
// Representa los datos personales ligados a un usuario. Igual que los otros
// controladores: sin SQL, sin lógica de acceso a datos. Solo validación,
// llamadas al modelo y respuesta HTTP.
//
// Particularidades de esta entidad:
//   1. 'id_usuario' debe existir → validamos antes de crear para dar 400 claro.
//   2. Relación 1:1 con usuario → si el usuario ya tiene persona, 409.
//   3. 'dpi' es UNIQUE → 409 si se duplica.
//   4. 'fecha_nacimiento' es DATEONLY → acepta 'YYYY-MM-DD'.
// ============================================================================

const { Persona, Usuario, Rol } = require('../models');

// ----------------------------------------------------------------------------
// LISTAR personas activas (con su usuario y rol)
// ----------------------------------------------------------------------------
// GET /api/personas/listar
// Hacemos un 'include' anidado: Persona → Usuario → Rol.
// Así la respuesta trae todo de una vez (el frontend no tiene que consultar
// nada extra para mostrar el nombre de usuario y su rol).
const listarPersonas = async (req, res) => {
  try {
    const personas = await Persona.findAll({
      where: { estado: 1 },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'usuario'],
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] },
          ],
        },
      ],
      order: [['id_persona', 'ASC']],
    });
    res.json(personas);
  } catch (error) {
    console.error('Error al listar personas:', error);
    res.status(500).json({ error: 'Error al listar personas' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER una persona por ID
// ----------------------------------------------------------------------------
// GET /api/personas/listar/:id
const obtenerPersona = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const persona = await Persona.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'usuario'],
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] },
          ],
        },
      ],
    });
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }
    res.json(persona);
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({ error: 'Error al obtener persona' });
  }
};

// ----------------------------------------------------------------------------
// CREAR una persona
// ----------------------------------------------------------------------------
// POST /api/personas/crear
// Body esperado:
// {
//   "nombre": "Juan Pérez",
//   "dpi": "1234567890123",
//   "fecha_nacimiento": "1990-05-15",
//   "telefono": "5555-5555",
//   "correo_electronico": "juan@example.com",
//   "direccion_domicilio": "Calle Falsa 123",
//   "id_usuario": 1
// }
const crearPersona = async (req, res) => {
  try {
    const {
      nombre,
      dpi,
      fecha_nacimiento,
      telefono,
      correo_electronico,
      direccion_domicilio,
      id_usuario,
    } = req.body;

    // ---- Validaciones de campos obligatorios ----
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    if (!dpi || typeof dpi !== 'string' || dpi.trim().length !== 13) {
      return res.status(400).json({ error: 'El DPI debe tener 13 caracteres' });
    }
    if (!fecha_nacimiento || typeof fecha_nacimiento !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "fecha_nacimiento" es obligatorio (YYYY-MM-DD)' });
    }
    if (!telefono || typeof telefono !== 'string') {
      return res.status(400).json({ error: 'El campo "telefono" es obligatorio' });
    }
    if (!correo_electronico || typeof correo_electronico !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "correo_electronico" es obligatorio' });
    }
    if (!direccion_domicilio || typeof direccion_domicilio !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "direccion_domicilio" es obligatorio' });
    }
    if (!Number.isInteger(id_usuario)) {
      return res
        .status(400)
        .json({ error: 'El campo "id_usuario" es obligatorio y debe ser entero' });
    }

    // ---- Verificar que el usuario exista (evita error FK) ----
    const usuarioExiste = await Usuario.findByPk(id_usuario);
    if (!usuarioExiste) {
      return res.status(400).json({ error: 'El usuario indicado no existe' });
    }

    // ---- Verificar relación 1:1 (Opción A: controlada por la app) ----
    // Si tu BD tiene el UNIQUE en id_usuario, este chequeo es redundante pero
    // sigue siendo útil: da un mensaje más claro que el error de constraint.
    const personaExistente = await Persona.findOne({ where: { id_usuario } });
    if (personaExistente) {
      return res
        .status(409)
        .json({ error: 'El usuario ya tiene una persona asociada' });
    }

    // ---- Crear la persona ----
    const nueva = await Persona.create({
      nombre: nombre.trim(),
      dpi: dpi.trim(),
      fecha_nacimiento,
      telefono: telefono.trim(),
      correo_electronico: correo_electronico.trim(),
      direccion_domicilio: direccion_domicilio.trim(),
      id_usuario,
    });

    // Re-consultamos con include para devolver la misma forma que el listar
    const creada = await Persona.findByPk(nueva.id_persona, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'usuario'],
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] },
          ],
        },
      ],
    });
    res.status(201).json(creada);
  } catch (error) {
    // Violación del UNIQUE del DPI (u otro índice único)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El DPI ya está registrado' });
    }
    console.error('Error al crear persona:', error);
    res.status(500).json({ error: 'Error al crear persona' });
  }
};

// ----------------------------------------------------------------------------
// ACTUALIZAR una persona
// ----------------------------------------------------------------------------
// PUT /api/personas/actualizar/:id
// Body esperado: igual que crear, PERO SIN 'id_usuario'.
// El vínculo con el usuario no se cambia desde aquí. Si algún día lo
// necesitas (reasignar persona a otro usuario), se hace con un endpoint
// dedicado y validaciones específicas.
const actualizarPersona = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const personaExistente = await Persona.findByPk(id);
    if (!personaExistente) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const {
      nombre,
      dpi,
      fecha_nacimiento,
      telefono,
      correo_electronico,
      direccion_domicilio,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    if (!dpi || typeof dpi !== 'string' || dpi.trim().length !== 13) {
      return res.status(400).json({ error: 'El DPI debe tener 13 caracteres' });
    }
    if (!fecha_nacimiento || typeof fecha_nacimiento !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "fecha_nacimiento" es obligatorio (YYYY-MM-DD)' });
    }
    if (!telefono || typeof telefono !== 'string') {
      return res.status(400).json({ error: 'El campo "telefono" es obligatorio' });
    }
    if (!correo_electronico || typeof correo_electronico !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "correo_electronico" es obligatorio' });
    }
    if (!direccion_domicilio || typeof direccion_domicilio !== 'string') {
      return res
        .status(400)
        .json({ error: 'El campo "direccion_domicilio" es obligatorio' });
    }

    await personaExistente.update({
      nombre: nombre.trim(),
      dpi: dpi.trim(),
      fecha_nacimiento,
      telefono: telefono.trim(),
      correo_electronico: correo_electronico.trim(),
      direccion_domicilio: direccion_domicilio.trim(),
    });

    // Re-consultamos con include para devolver la forma "completa"
    const actualizada = await Persona.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'usuario'],
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] },
          ],
        },
      ],
    });
    res.json(actualizada);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El DPI ya está registrado' });
    }
    console.error('Error al actualizar persona:', error);
    res.status(500).json({ error: 'Error al actualizar persona' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO (soft delete / reactivación)
// ----------------------------------------------------------------------------
// PATCH /api/personas/cambio/:id/estado
// Body esperado: { "estado": 0 } o { "estado": 1 }
const cambiarEstadoPersona = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { estado } = req.body;
    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ error: 'El campo "estado" debe ser 0 o 1' });
    }

    const persona = await Persona.findByPk(id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    await persona.update({ estado });

    // Re-consultamos para devolver con include (usuario + rol)
    const actualizada = await Persona.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id_usuario', 'usuario'],
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'rol'] },
          ],
        },
      ],
    });
    res.json(actualizada);
  } catch (error) {
    console.error('Error al cambiar estado de persona:', error);
    res.status(500).json({ error: 'Error al cambiar estado de persona' });
  }
};

module.exports = {
  listarPersonas,
  obtenerPersona,
  crearPersona,
  actualizarPersona,
  cambiarEstadoPersona,
};