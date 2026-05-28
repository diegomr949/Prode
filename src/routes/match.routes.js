import { Router } from 'express';
import { getPartidos, getMisPredicciones, guardarPrediccion } from '../controllers/match.controller.js'; // Controladores que haremos en el próximo paso
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas estas rutas requieren autenticación
router.use(verifyToken);

router.get('/', getPartidos);
router.get('/predicciones/mis-predicciones', getMisPredicciones);
router.post('/predicciones', guardarPrediccion);

export default router;