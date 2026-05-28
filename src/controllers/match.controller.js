import { MatchService } from '../services/match.service.js';

export const getPartidos = async (req, res, next) => {
  try {
    const estadoFiltro = req.query.estado; // Ej: ?estado=PENDIENTE
    const partidos = await MatchService.getAllMatches(estadoFiltro);
    
    res.json({ error: false, code: 200, data: partidos });
  } catch (error) {
    next(error);
  }
};

export const getMisPredicciones = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const predicciones = await MatchService.getUserPredictions(userId);
    
    res.json({ error: false, code: 200, data: predicciones });
  } catch (error) {
    next(error);
  }
};

export const guardarPrediccion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { partidoId, golesLocal, golesVisitante } = req.body;

    // Validación estricta de inputs
    if (!Number.isInteger(partidoId) || !Number.isInteger(golesLocal) || !Number.isInteger(golesVisitante)) {
      return res.status(400).json({ error: true, code: 400, data: { error: 'Datos inválidos o incompletos' } });
    }

    if (golesLocal < 0 || golesLocal > 20 || golesVisitante < 0 || golesVisitante > 20) {
      return res.status(400).json({ error: true, code: 400, data: { error: 'Goles fuera de rango' } });
    }

    const savedPrediction = await MatchService.upsertPrediction(userId, partidoId, golesLocal, golesVisitante);
    
    res.json({ error: false, code: 200, data: savedPrediction });
  } catch (error) {
    next(error);
  }
};