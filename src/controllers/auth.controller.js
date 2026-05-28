import { AuthService } from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: true, code: 400, data: { error: 'Email y password son requeridos' } });
    }

    const userData = await AuthService.authenticate(email, password);
    res.json({ error: false, code: 200, data: userData });
  } catch (error) {
    next(error); // Pasa el error al middleware global de errores
  }
};

export const registro = async (req, res, next) => {
  try {
    const { nombre, email, password, area } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: true, code: 400, data: { error: 'Datos incompletos' } });
    }

    const newUser = await AuthService.register({ nombre, email, password, area });
    res.status(201).json({ error: false, code: 201, data: newUser });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    // req.user.id viene del token decodificado por el auth.middleware
    const user = await AuthService.getUserById(req.user.id);
    res.json({ error: false, code: 200, data: user });
  } catch (error) {
    next(error);
  }
};