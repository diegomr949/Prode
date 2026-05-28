import { Router } from 'express';
import { 
  getUsuarios, 
  getDashboard, 
  resetPassword, 
  actualizarArea, 
  cargarResultado 
} from '../controllers/admin.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// BLINDAJE: Toda la ruta /admin requiere estar logueado y ser ROLE_ADMIN
router.use(verifyToken, requireAdmin);

router.get('/usuarios', getUsuarios);
router.get('/usuarios/:id/dashboard', getDashboard);
router.put('/usuarios/:id/reset-password', resetPassword);
router.put('/usuarios/:id/area', actualizarArea);
router.put('/partidos/:id/resultado', cargarResultado);

export default router;