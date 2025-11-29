import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// JWT_EXPIRES_IN должен быть строкой (например, '24h', '7d', '30d')
// jsonwebtoken библиотека принимает строки в формате: <number><unit> где unit может быть: s, m, h, d
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'; // По умолчанию 7 дней

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Недействительный или истекший токен');
  }
};

