import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: true, code: 401, data: { error: 'No se proporcionó token de autenticación' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol, ... }
    next();
  } catch (error) {
    return res.status(401).json({ error: true, code: 401, data: { error: 'Sesión expirada o token inválido' } });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'ROLE_ADMIN') {
    return res.status(403).json({ error: true, code: 403, data: { error: 'Acceso denegado: Se requieren permisos de administrador' } });
  }
  next();
};