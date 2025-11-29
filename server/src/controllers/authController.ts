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
      throw new AppError('Логин и пароль обязательны для заполнения', 400);
    }

    const user = await appUserRepository.findByUsername(username);

    if (!user) {
      throw new AppError('Неверный логин или пароль', 401);
    }

    if (!user.is_active) {
      throw new AppError('Учетная запись пользователя отключена', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Неверный логин или пароль', 401);
    }

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
      throw new AppError('Требуется авторизация', 401);
    }

    const user = await appUserRepository.findById(req.user.userId);

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

