// src/server.js

// ============================================================================
// ARRANQUE DEL SERVIDOR
// ============================================================================
// Este archivo es el PUNTO DE ENTRADA de tu aplicación (el que ejecuta
// 'nodemon' o 'node'). Su única responsabilidad es:
//   1. Importar la app ya configurada desde app.js
//   2. Escuchar en un puerto para recibir peticiones HTTP
//
// Es intencionalmente delgado: NO configura middlewares, NO monta rutas,
// NO define lógica de negocio. Todo eso ya está en app.js y en las carpetas
// controllers/, routes/, config/. Aquí solo "se enciende el motor".
// ============================================================================

// ----------------------------------------------------------------------------
// NUEVA LÍNEA AQUÍ
// ----------------------------------------------------------------------------
// Aumentamos el límite de escuchadores para evitar warnings de nodemon
require('events').EventEmitter.defaultMaxListeners = 20;

// ----------------------------------------------------------------------------
// 1. IMPORTACIÓN DE LA APP
// ----------------------------------------------------------------------------

// Importamos la instancia de Express ya configurada desde './app'.
// Recuerda que app.js termina con:
//   module.exports = app;
// Por eso aquí podemos recibirla directamente.
//
// Lo importante: la app llega YA armada, con express.json() y los routers
// montados. Este archivo no necesita saber nada de eso. Solo la arranca.
const app = require('./app');


// ----------------------------------------------------------------------------
// 2. DEFINICIÓN DEL PUERTO
// ----------------------------------------------------------------------------

// 'process.env.PORT' lee la variable de entorno PORT, si existe.
// El operador '||' (OR lógico) significa: "usa process.env.PORT si está
// definido y es truthy; si no, usa 3000 por defecto".
//
// ¿Por qué no hardcodear 3000?
//   - En producción (Railway, Render, Heroku, AWS, etc.) la plataforma
//     asigna dinámicamente el puerto mediante la variable PORT. Si el
//     código dice '3000' fijo, la app fallará porque ese puerto no estará
//     disponible o no será el que la plataforma espera.
//   - En desarrollo local, no defines PORT en el .env, así que cae en 3000.
//   - Si algún día quieres correr dos instancias en paralelo, puedes hacer
//     PORT=3001 npm run dev y la segunda usará 3001 sin tocar el código.
//
// Regla de oro en Node.js: 'process.env.PORT || <default>' es el patrón
// estándar para todos los servidores. No lo cambies.
const PORT = process.env.PORT || 3000;


// ----------------------------------------------------------------------------
// 3. LEVANTAR EL SERVIDOR
// ----------------------------------------------------------------------------

// 'app.listen(puerto, callback)' hace DOS cosas a la vez:
//   a) Abre un socket TCP escuchando en el puerto indicado (3000).
//   b) Registra el callback que se ejecuta cuando el servidor ya está
//      listo para recibir peticiones.
//
// A partir de este momento, cualquier petición HTTP que llegue a
// http://localhost:3000 será procesada por la app de Express (con sus
// middlewares y routers). Si nadie la atiende (porque la ruta no existe),
// Express devolverá un 404 automáticamente.
//
// El callback es el lugar ideal para imprimir en consola un mensaje que
// confirme que el servidor arrancó bien. Sin él, no tendrías feedback
// visual de que el servidor está escuchando.
//
// Nota: 'app.listen' devuelve una instancia de http.Server (no la guardamos
// porque no la necesitamos aquí; en apps más avanzadas se guarda para
// hacer 'server.close()' en un apagado ordenado, pero para un prototipo
// no hace falta).
app.listen(PORT, () => {
  // Template literal con backticks: inserta el valor de PORT en el string.
  // Si PORT = 3000, imprime: "Servidor corriendo en http://localhost:3000"
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});