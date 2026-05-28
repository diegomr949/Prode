import 'dotenv/config';
import app from './src/app.js';
import prisma from './src/config/db.js';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado exitosamente a PostgreSQL');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();