import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';
import { generateToken } from '../utils/jwt';
import { LoginInput, LoginResponse } from '../types';
import { appUserRepository } from '../repositories/appUserRepository';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password }: LoginInput = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    // Находим пользователя
    const user = await appUserRepository.findByUsername(username);

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    // Проверяем, активен ли пользователь
    if (!user.is_active) {
      throw new AppError('User account is disabled', 403);
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };

    res.json({
      status: 'success',
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const user = await appUserRepository.findById(req.user.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

