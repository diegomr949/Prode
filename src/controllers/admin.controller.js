import prisma from '../config/db.js';
import bcrypt from 'bcrypt';

/**
 * Obtiene todos los usuarios y calcula dinámicamente sus estadísticas.
 * En bases relacionales, delegamos el conteo a la DB.
 */
export const getUsuarios = async (req, res, next) => {
  try {
    const usuarios = await prisma.user.findMany({
      where: { rol: { not: 'ROLE_ADMIN' } },
      select: {
        id: true,
        nombre: true,
        email: true,
        area: true,
        rol: true,
        puntosTotales: true,
        plenosTotales: true,
        _count: {
          select: { predictions: true } // Cuenta total de predicciones
        }
      },
      orderBy: [
        { puntosTotales: 'desc' },
        { plenosTotales: 'desc' }
      ]
    });

    // Mapeamos para mantener la estructura que espera tu frontend
    const data = usuarios.map(u => ({
      ...u,
      partidosPredichos: u._count.predictions,
      // Pendientes: Asumimos que si no tiene puntos, no ha sido evaluada
      partidosPendientes: 0 // Simplificado para este scope, se puede cruzar con el estado del partido
    }));

    res.json({ error: false, code: 200, data });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  const userId = parseInt(req.params.id);
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        predictions: {
          include: {
            match: {
              select: { grupo: true, fechaHora: true, estado: true }
            }
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: true, code: 404, data: { error: 'Usuario no encontrado' } });
    }

    const data = {
      ...usuario,
      partidosPredichos: usuario.predictions.length,
      partidosPendientes: usuario.predictions.filter(p => p.puntosObtenidos === null).length
    };

    res.json({ error: false, code: 200, data });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const userId = parseInt(req.params.id);
  const { nuevaPassword } = req.body;

  if (!nuevaPassword || nuevaPassword.length < 6) {
    return res.status(400).json({ error: true, code: 400, data: { error: 'Contraseña inválida' } });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ error: false, code: 200, data: { success: true } });
  } catch (error) {
    if (error.code === 'P2025') { // Código de Prisma para "Record not found"
      return res.status(404).json({ error: true, code: 404, data: { error: 'Usuario no encontrado' } });
    }
    next(error);
  }
};

export const actualizarArea = async (req, res, next) => {
  const userId = parseInt(req.params.id);
  const { area } = req.body;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { area: area || null }
    });

    res.json({ error: false, code: 200, data: { success: true } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: true, code: 404, data: { error: 'Usuario no encontrado' } });
    }
    next(error);
  }
};

/**
 * CORE LOGIC: Transacción ACID para asegurar que si falla el cálculo
 * de puntos, no se guarde el resultado del partido, evitando inconsistencias.
 */
export const cargarResultado = async (req, res, next) => {
  const matchId = parseInt(req.params.id);
  const { golesLocal, golesVisitante } = req.body;

  if (golesLocal == null || golesVisitante == null) {
    return res.status(400).json({ error: true, code: 400, data: { error: 'Goles incompletos' } });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Guardar resultado real y cerrar el partido
      await tx.match.update({
        where: { id: matchId },
        data: { golesLocal, golesVisitante, estado: 'FINALIZADO' }
      });

      // 2. Traer todas las predicciones para este partido
      const predictions = await tx.prediction.findMany({ where: { matchId } });
      const signoReal = Math.sign(golesLocal - golesVisitante);

      // 3. Evaluar cada predicción y actualizar los puntajes del usuario
      for (const pred of predictions) {
        let pts = 0;
        
        // Regla: Pleno (3pts) o Tendencia (1pt)
        if (pred.golesLocalPredichos === golesLocal && pred.golesVisitantePredichos === golesVisitante) {
          pts = 3;
        } else if (Math.sign(pred.golesLocalPredichos - pred.golesVisitantePredichos) === signoReal) {
          pts = 1;
        }

        // Si ya tenía puntos calculados previamente (re-evaluación por error de carga manual)
        // debemos revertir los puntos anteriores antes de aplicar los nuevos.
        const puntosAnteriores = pred.puntosObtenidos || 0;
        const diferenciaPuntos = pts - puntosAnteriores;
        
        let plenosAnteriores = (puntosAnteriores === 3) ? 1 : 0;
        let plenosNuevos = (pts === 3) ? 1 : 0;
        let diferenciaPlenos = plenosNuevos - plenosAnteriores;

        // Actualizar la predicción
        await tx.prediction.update({
          where: { id: pred.id },
          data: { puntosObtenidos: pts }
        });

        // Actualizar el perfil del usuario sumando/restando el delta
        if (diferenciaPuntos !== 0 || diferenciaPlenos !== 0) {
          await tx.user.update({
            where: { id: pred.userId },
            data: {
              puntosTotales: { increment: diferenciaPuntos },
              plenosTotales: { increment: diferenciaPlenos }
            }
          });
        }
      }
    });

    res.json({ error: false, code: 200, data: { success: true, mensaje: "Resultado cargado y puntos calculados" } });
  } catch (error) {
    next(error);
  }
};