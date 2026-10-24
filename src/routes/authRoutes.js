// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { loginLimiter } = require('../middlewares/rateLimiter');

// POST /api/auth/login → login público (sin middleware, obvio)
router.post('/login', loginLimiter, authController.login);

// GET /api/auth/me → requiere token válido
router.get('/me', verificarToken, authController.me);

module.exports = router;