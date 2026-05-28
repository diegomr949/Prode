import 'dotenv/config';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

// Validación de variables críticas
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ ERROR CRÍTICO: Falta la variable de entorno ${envVar}`);
    process.exit(1);
  }
});

export const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
};