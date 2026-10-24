// src/middlewares/uploadMiddleware.js
// ============================================================================
// MIDDLEWARE: subida, procesamiento y almacenamiento en Cloudinary
// ============================================================================
// 1. Multer recibe la imagen en memoria (hasta 25 MB).
// 2. Sharp la redimensiona, la convierte a WebP y le extrae el color.
// 3. El resultado se sube a Cloudinary.
// 4. Guardamos la URL pública de Cloudinary en req.file.filename.
// ============================================================================

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const cloudinary = require('../config/cloudinary'); // <-- Importamos la config

// Configuramos Multer en memoria (NO guarda en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (permitidos.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Formato no permitido'), false);
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Función auxiliar para subir un Buffer a Cloudinary
const subirBufferACloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'lago_azul_productos', // Carpeta en tu cuenta de Cloudinary
        format: 'webp'                 // Aseguramos el formato
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
};

// Middleware principal
const subirYProcesarFotoProducto = [
  upload.single('foto'),
  async (req, res, next) => {
    if (!req.file) return next(); // Si no hay foto, sigue sin error

    try {
      // 1. Sharp procesa el buffer en memoria (Redimensionar y WebP)
      const bufferProcesado = await sharp(req.file.buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer(); // <-- Usamos toBuffer() en lugar de toFile()

      // 2. EXTRAER EL COLOR (Usando Sharp)
      try {
        const { data } = await sharp(req.file.buffer)
          .extract({ left: 0, top: 0, width: 200, height: 200 })
          .resize(1, 1)
          .raw()
          .toBuffer({ resolveWithObject: true });

        const [r, g, b] = data;
        const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        req.file.color_hex = hex;
      } catch (colorError) {
        console.warn('No se pudo extraer el color automáticamente:', colorError.message);
        req.file.color_hex = '#CCCCCC';
      }

      // 3. Subir el buffer procesado a Cloudinary
      const resultado = await subirBufferACloudinary(bufferProcesado);

      // 4. Reemplazamos los datos del archivo con la URL de Cloudinary
      req.file.filename = resultado.secure_url; // URL completa (https://res.cloudinary.com/...)
      req.file.path = resultado.secure_url;

      next();
    } catch (error) {
      console.error('Error procesando imagen y subiendo a Cloudinary:', error);
      res.status(500).json({ error: 'Error al procesar y subir la imagen' });
    }
  },
];

module.exports = { subirYProcesarFotoProducto, upload };