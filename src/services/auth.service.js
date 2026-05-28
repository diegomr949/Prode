import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export const AuthService = {
  async authenticate(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { statusCode: 401, message: 'Credenciales incorrectas' };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw { statusCode: 401, message: 'Credenciales incorrectas' };
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Sesión válida por 7 días
    );

    return {
      token,
      nombre: user.nombre,
      email: user.email,
      area: user.area,
      rol: user.rol
    };
  },

  async register(data) {
    const { nombre, email, password, area } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw { statusCode: 400, message: 'El email ya está registrado' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        area: area || null,
        rol: 'ROLE_USER'
      }
    });

    // Auto-login post registro
    const token = jwt.sign(
      { id: newUser.id, rol: newUser.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      nombre: newUser.nombre,
      email: newUser.email,
      area: newUser.area,
      rol: newUser.rol
    };
  },

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true, area: true, rol: true } // Excluimos el password
    });
    
    if (!user) throw { statusCode: 404, message: 'Usuario no encontrado' };
    return user;
  }
};