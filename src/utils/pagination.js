// src/utils/pagination.js
// ============================================================================
// PAGINACIÓN GLOBAL
// ============================================================================
// Se usa en cualquier controlador que liste registros. Lee ?page y ?limit
// de la query string, calcula el offset de SQL, y ayuda a formatear la
// respuesta con metadatos (total, totalPages, hasNext, etc.).
// ============================================================================

// getPagination(req) → { page, limit, offset }
// - page: >= 1 (default 1)
// - limit: entre 1 y maxLimit (default defaultLimit)
// - offset: (page - 1) * limit, para usar en el findAndCountAll
const getPagination = (req, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.query.limit, 10) || defaultLimit)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// formatPaginatedResponse(data, total, page, limit) → { data, meta }
// Envuelve el array de resultados con metadatos útiles para el frontend
// (para que sepa cuántas páginas hay y pueda renderizar los botones).
const formatPaginatedResponse = (data, total, page, limit) => {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = { getPagination, formatPaginatedResponse };