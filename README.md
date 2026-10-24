# Backend - Lago Azul (Node.js + Express)

Este es el servidor API REST para el sistema de inventario de Lago Azul.

## Tecnologías
- Node.js
- Express
- Sequelize (ORM para MySQL)
- JWT para autenticación
- Sharp para procesamiento de imágenes
- Cors para la comunicación

## Instalación Local
1. Clonar el repositorio.
2. Ejecutar `npm install`.
3. Crear un archivo `.env` basado en el `.env.example`.
4. Ejecutar `npm run dev`.

## Despliegue en Render
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Variables de entorno necesarias:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`.