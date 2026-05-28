import prisma from '../config/db.js';

export const MatchService = {
  async getAllMatches(estadoFiltro) {
    const whereClause = estadoFiltro ? { estado: estadoFiltro } : {};

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        homeTeam: { select: { nombre: true, banderaUrl: true } },
        awayTeam: { select: { nombre: true, banderaUrl: true } }
      },
      orderBy: { fechaHora: 'asc' }
    });

    // Formateamos la salida para que el frontend no note el cambio de motor
    return matches.map(m => ({
      id: m.id,
      grupo: m.grupo,
      fechaHora: m.fechaHora,
      equipoLocal: m.homeTeam.nombre,
      equipoVisitante: m.awayTeam.nombre,
      banderaLocal: m.homeTeam.banderaUrl,
      banderaVisitante: m.awayTeam.banderaUrl,
      golesLocal: m.golesLocal,
      golesVisitante: m.golesVisitante,
      estado: m.estado,
      prediccionBloqueada: m.estado !== 'PENDIENTE'
    }));
  },

  async getUserPredictions(userId) {
    return await prisma.prediction.findMany({
      where: { userId },
      select: {
        id: true,
        partidoId: matchId, // Alias para compatibilidad con el front
        golesLocalPredichos: true,
        golesVisitantePredichos: true,
        puntosObtenidos: true,
        fechaCarga: true
      }
    });
  },

  async upsertPrediction(userId, matchId, golesLocal, golesVisitante) {
    // 1. Validar regla de negocio: ¿El partido está abierto?
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    
    if (!match) {
      throw { statusCode: 404, message: 'Partido no encontrado' };
    }
    
    if (match.estado !== 'PENDIENTE') {
      throw { statusCode: 403, message: 'El partido ya está cerrado. No puedes modificar tu predicción.' };
    }

    // 2. Guardar o actualizar (Upsert)
    // El frontend mandaba crear múltiples filas en Apps Script. 
    // Prisma `upsert` es perfecto: actualiza si existe, crea si no.
    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId, matchId } // Constraint única definida en schema
      },
      update: {
        golesLocalPredichos: golesLocal,
        golesVisitantePredichos: golesVisitante,
        fechaCarga: new Date()
      },
      create: {
        userId,
        matchId,
        golesLocalPredichos: golesLocal,
        golesVisitantePredichos: golesVisitante
      }
    });

    return {
      id: prediction.id,
      partidoId: prediction.matchId,
      golesLocalPredichos: prediction.golesLocalPredichos,
      golesVisitantePredichos: prediction.golesVisitantePredichos
    };
  }
};