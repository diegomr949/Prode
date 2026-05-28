import { Router } from 'express';
import { login, registro, me } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas Públicas
router.post('/login', login);
router.post('/registro', registro);

// Rutas Protegidas
router.get('/me', verifyToken, me);

export default router;