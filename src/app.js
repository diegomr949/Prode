import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middlewares/error.middleware.js';

// 1. IMPORTAMOS LAS RUTAS QUE YA CREAMOS
import authRoutes from './routes/auth.routes.js';
import matchRoutes from './routes/match.routes.js';
import adminRoutes from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares Globales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://cpcemza.org.ar", "https://flagcdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({ origin: '*' }));
app.use(compression());
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev'));

// Rate Limiting general para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  message: { error: true, code: 429, data: { error: 'Demasiadas peticiones, intenta de nuevo más tarde.' } }
});
app.use('/api/', apiLimiter);

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// 2. ENLAZAMOS LAS RUTAS A SUS ENDPOINTS BASE
app.use('/api/auth', authRoutes);
app.use('/api/partidos', matchRoutes);
app.use('/api/admin', adminRoutes);

// Manejo de rutas no encontradas y errores
app.use((req, res, next) => {
  res.status(404).json({ error: true, code: 404, data: { error: 'Ruta no encontrada' } });
});
app.use(errorHandler);

export default app;