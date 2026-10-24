// src/middlewares/uploadMiddleware.js
// ============================================================================
// MIDDLEWARE: subida de archivos (Multer)
// ============================================================================
// Recibe 'multipart/form-data' con un archivo en el campo 'foto'.
// Lo guarda en UPLOAD_DIR con un nombre único (timestamp-random.ext).
// Después del middleware, el archivo está en:
//   - req.file.filename   → nombre con el que se guardó (ej: 1729500000-123456789.jpg)
//   - req.file.path       → ruta absoluta en disco
//   - req.file.size       → tamaño en bytes
// Lo que se guarda en la BD es SOLO req.file.filename, no la ruta completa.
// ============================================================================

const multer = require('multer');
const sharp = require('sharp');
const ColorThief = require('colorthief');
const path = require('path');
const { UPLOAD_DIR } = require('../config/uploads');

// // ---- Almacenamiento en disco ----
// const storage = multer.diskStorage({
//   // Carpeta destino: la configurada en UPLOAD_DIR
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),

//   // Nombre del archivo: timestamp + random + extensión original.
//   // El random evita colisiones si dos suben el mismo nombre en el mismo ms.
//   filename: (req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `${unique}${ext}`);
//   },
// });

// // ---- Filtro de tipo de archivo ----
// // Solo acepta imágenes comunes. Si llega un PDF o un .exe, lo rechaza.
// const fileFilter = (req, file, cb) => {
//   const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
//   if (permitidos.includes(file.mimetype)) {
//     return cb(null, true);
//   }
//   // El segundo argumento 'false' cancela la subida.
//   // El controlador recibirá el error en el catch.
//   cb(new Error('Formato de imagen no permitido (solo jpg, png, webp, gif)'), false);
// };

// // ---- Instancia de Multer configurada ----
// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024,   // máximo 5 MB por archivo
//   },
// });

// // Exportamos dos variantes:
// // - 'subirFotoProducto' → espera UN archivo en el campo 'foto' del form-data
// // - 'upload' → la instancia cruda, por si algún endpoint necesita otra cosa
// const subirFotoProducto = upload.single('foto');

// module.exports = { subirFotoProducto, upload };
// ---------------------------------------------------------------------------------------------------------------------
// Multer en memoria: el archivo original NO se escribe en disco.
// El límite de 25 MB es solo una "puerta de entrada" para evitar abusos.
// NO es el peso final: Sharp lo reducirá a unos cientos de KB.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (permitidos.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Formato no permitido'), false);
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB: suficiente para fotos de móvil de alta calidad
});

// Middleware que procesa con Sharp después de Multer
const subirYProcesarFotoProducto = [
  upload.single('foto'), // 1. Multer recibe el archivo
  async (req, res, next) => {
    if (!req.file) return next(); // Si no hay foto, sigue sin error

    try {
      // 2. Sharp procesa el buffer en memoria
      const nombreArchivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const rutaFinal = path.join(UPLOAD_DIR, nombreArchivo);

      await sharp(req.file.buffer)
        .resize({
          width: 1200,            // Ancho máximo (evita fotos de 4000px)
          height: 1200,           // Alto máximo (mantiene proporción)
          fit: 'inside',          // No recorta, solo encaja dentro del límite
          withoutEnlargement: true, // Si la imagen es más pequeña, no la agranda
        })
        .webp({ quality: 82 })    // Calidad 82: el "sweet spot" recomendado
        .toFile(rutaFinal);

      // 2. EXTRAER EL COLOR (Usando Sharp, sin colorthief)
      try {
        // Tomamos una porción de la esquina superior izquierda (donde está el hilo, no la etiqueta)
        // Ajusta el ancho/alto según tus fotos. Usamos 200x200.
        const { data, info } = await sharp(req.file.buffer)
          .extract({ left: 0, top: 0, width: 200, height: 200 }) // Puedes probar cambiando a { left: 0, top: 0, width: 100, height: 100 }
          .resize(1, 1) // Reducimos todo a 1 solo píxel
          .raw()
          .toBuffer({ resolveWithObject: true });

        // data tendrá el RGB de ese píxel: [R, G, B]
        const [r, g, b] = data;
        const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        req.file.color_hex = hex;
      } catch (colorError) {
        console.warn('No se pudo extraer el color automáticamente:', colorError.message);
        req.file.color_hex = '#CCCCCC';
      }

      // 3. Reemplazamos los datos del archivo por el nombre final
      req.file.filename = nombreArchivo;
      req.file.path = rutaFinal;

      next();
    } catch (error) {
      console.error('Error procesando imagen:', error);
      res.status(500).json({ error: 'Error al procesar la imagen' });
    }
  },
];

module.exports = { subirYProcesarFotoProducto, upload };