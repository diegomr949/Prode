import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos...');

  // 1. Crear Usuario Administrador institucional
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cpce.org.ar' },
    update: {},
    create: {
      nombre: 'Admin Prode',
      email: 'admin@cpce.org.ar',
      password: hash,
      area: 'Sistemas',
      rol: 'ROLE_ADMIN'
    }
  });
  console.log(`👤 Admin creado: ${admin.email}`);

  // 2. Crear Equipos Base (Ejemplo)
  const arg = await prisma.team.upsert({
    where: { nombre: 'Argentina' },
    update: {},
    create: { nombre: 'Argentina', grupo: 'A', banderaUrl: 'https://flagcdn.com/w80/ar.png', rankFifa: 1, titulosMundiales: 3 }
  });

  const mex = await prisma.team.upsert({
    where: { nombre: 'México' },
    update: {},
    create: { nombre: 'México', grupo: 'A', banderaUrl: 'https://flagcdn.com/w80/mx.png', rankFifa: 12, titulosMundiales: 0 }
  });

  const usa = await prisma.team.upsert({
    where: { nombre: 'Estados Unidos' },
    update: {},
    create: { nombre: 'Estados Unidos', grupo: 'B', banderaUrl: 'https://flagcdn.com/w80/us.png', rankFifa: 11, titulosMundiales: 0 }
  });

  console.log('🏳️ Equipos creados');

  // 3. Crear Partidos Iniciales
  await prisma.match.createMany({
    skipDuplicates: true,
    data: [
      {
        grupo: 'A',
        fechaHora: new Date(new Date().getTime() + 86400000), // Mañana
        homeTeamId: arg.id,
        awayTeamId: mex.id,
        estado: 'PENDIENTE'
      }
    ]
  });
  console.log('⚽ Partidos de prueba creados');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });