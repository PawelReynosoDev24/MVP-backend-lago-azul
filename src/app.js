// src/app.js

// ============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN EXPRESS
// ============================================================================
// Este archivo crea y configura la aplicación de Express: qué middlewares usa,
// qué rutas monta, etc. NO inicia el servidor (eso lo hace server.js).
// Esta separación es clave porque permite testear la app sin levantarla.
// ============================================================================


// ----------------------------------------------------------------------------
// 1. IMPORTACIÓN DE EXPRESS
// ----------------------------------------------------------------------------

// 'express' es el framework que nos da toda la infraestructura HTTP:
// manejo de rutas, middlewares, parsing de requests, envío de respuestas, etc.
// Al hacer 'require', obtenemos la función principal de Express, que al
// llamarla crea una nueva instancia de una aplicación.
const express = require('express');
const path = require('path');
const { UPLOAD_DIR } = require('./config/uploads');
const cors = require('cors');

// ----------------------------------------------------------------------------
// 2. CREACIÓN DE LA APLICACIÓN
// ----------------------------------------------------------------------------

// 'app' es la instancia de tu aplicación Express.
// Piensa en ella como el "objeto servidor" sobre el que vas a configurar todo:
//   - app.use(...)   → añadir middlewares
//   - app.get(...)   → manejar peticiones GET
//   - app.post(...)  → manejar peticiones POST
//   - app.listen(...)→ escuchar en un puerto (esto lo hace server.js, no aquí)
// Es literalmente la app completa, encapsulada en un objeto.
const app = express();

// ----------------------------------------------------------------------------
// 3. MIDDLEWARES GLOBALES
// ----------------------------------------------------------------------------

// Un "middleware" es una función que se ejecuta ENTRE la petición y la
// respuesta. Puede:
//   - Leer o modificar el request (req)
//   - Leer o modificar el response (res)
//   - Terminar la petición (enviando respuesta)
//   - Pasar al siguiente middleware (llamando a next())
//
// 'app.use(fn)' registra un middleware que se ejecuta en TODAS las rutas,
// sin importar el método (GET, POST, PUT, DELETE, etc.).

// express.json() es un middleware incluido en Express (desde la v4.16).
// Su trabajo: si la petición llega con 'Content-Type: application/json',
// lee el cuerpo (body) de la petición, lo convierte de JSON a un objeto
// JavaScript y lo deja disponible en 'req.body'.
//
// Ejemplo: si el cliente envía esta petición:
//   POST /api/auth/login
//   Content-Type: application/json
//
//   { "usuario": "admin", "contrasenia": "1234" }
//
// Gracias a este middleware, dentro de tu controlador podrás usar:
//   req.body.usuario       // => "admin"
//   req.body.contrasenia   // => "1234"
//
// SIN este middleware, 'req.body' sería 'undefined' y no podrías leer
// datos del cliente. Por eso es imprescindible para un API con login y CRUD.
app.use(express.json());

// ----------------------------------------------------------------------------
// 4. MONTAJE DE RUTAS (comentado por ahora)
// ----------------------------------------------------------------------------

// 'app.use(prefijo, router)' monta un conjunto de rutas bajo un prefijo.
// Se llama "montar" porque es como colgar un subárbol de rutas en un punto
// del árbol principal. Cada router (definido en archivos aparte) agrupa
// las rutas de un recurso (auth, productos, roles, etc.).
//
// Ejemplo de cómo funcionará cuando descomentes la primera línea:
//   - Dentro de authRoutes.js tendrás algo como:
//       router.post('/login', loginController);
//       router.post('/registro', registroController);
//   - Gracias al prefijo '/api/auth', las rutas finales serán:
//       POST /api/auth/login
//       POST /api/auth/registro
//
// Es decir: el prefijo del 'app.use' + la ruta del router se CONCATENAN.
// Esto te permite mantener cada grupo de rutas aislado y ordenado.

// Rutas de autenticación (login, registro, logout, refresh token...)
// Se activarán cuando tengas creado 'src/routes/authRoutes.js'
// app.use('/api/auth', require('./routes/authRoutes'));

// === FOTOS ===
// Servir las imágenes subidas en /uploads/<archivo>
// URL final: http://localhost:3000/uploads/1729500000-123456789.jpg
app.use('/uploads', express.static(UPLOAD_DIR));

// === MONTAJE DE ROUTERS DE AUTENTICACIÓN ===
app.use('/api/auth', require('./routes/authRoutes'));

// Rutas de productos (CRUD completo: listar, crear, editar, eliminar)
// Se activarán cuando tengas creado 'src/routes/productoRoutes.js'
// app.use('/api/productos', require('./routes/productoRoutes'));

// Aquí añadirás más adelante, con el mismo patrón:
// app.use('/api/roles', require('./routes/rolRoutes'));
// app.use('/api/movimientos', require('./routes/movimientoRoutes'));
// app.use('/api/unidades', require('./routes/unidadRoutes'));

// === MONTAJE DE ROUTERS ===
app.use('/api/roles', require('./routes/rolRoutes'));
app.use('/api/usuarios', require('./routes/usuarioRoutes'));
app.use('/api/personas', require('./routes/personaRoutes'));
app.use('/api/unidades', require('./routes/unidadRoutes'));
app.use('/api/conversiones', require('./routes/conversionRoutes'));
app.use('/api/productos', require('./routes/productoRoutes'));
app.use('/api/movimientos', require('./routes/movimientoRoutes'));
app.use('/api/bodega', require('./routes/bodegaRoutes'));
app.use('/api/permisos', require('./routes/permisoRoutes'));

// ============================================================================
// HANDLER GLOBAL DE 404
// ============================================================================
// Este middleware se ejecuta SOLO si ninguna ruta anterior matcheó (es decir,
// si Express llegó hasta aquí sin enviar respuesta). Debe ir SIEMPRE al final
// de app.js. Devuelve JSON consistente en lugar del HTML feo de Express.
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    method: req.method,
    path: req.originalUrl,
  });
});


// Usa una variable de entorno para la URL del frontend en producción
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));


// ----------------------------------------------------------------------------
// 5. EXPORTACIÓN DE LA APP
// ----------------------------------------------------------------------------

// Exportamos la app configurada para que 'server.js' la importe y la arranque.
// Esta separación (app.js vs server.js) te da ventajas importantes:
//   1. Testing: puedes importar 'app' en tus tests y probar endpoints
//      SIN necesidad de abrir un puerto real (usando supertest, por ejemplo).
//   2. Reutilización: si algún día quieres correr la app en AWS Lambda
//      o en un entorno serverless, solo usas 'app' sin tocar server.js.
//   3. Claridad: este archivo dice "QUÉ es la app" y server.js dice
//      "CÓMO se lanza". Cada uno tiene una responsabilidad única.
module.exports = app;