import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';
import {
  CreateAppUserInput,
  UpdateAppUserInput,
} from '../types';
import { appUserRepository } from '../repositories/appUserRepository';

export const getAllAppUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может просматривать пользователей
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can view users', 403);
    }

    const users = await appUserRepository.findAll();
    res.json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может просматривать пользователей
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can view users', 403);
    }

    const { id } = req.params;
    const user = await appUserRepository.findById(parseInt(id));

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

export const createAppUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может создавать пользователей
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can create users', 403);
    }

    const data: CreateAppUserInput = req.body;

    if (!data.username || !data.password || !data.role) {
      throw new AppError(
        'username, password, and role are required',
        400
      );
    }

    // Хэшируем пароль
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await appUserRepository.create(data, passwordHash);

    res.status(201).json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('Username already exists', 409);
    }
    next(error);
  }
};

export const updateAppUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может обновлять пользователей
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can update users', 403);
    }

    const { id } = req.params;
    const updates: UpdateAppUserInput = req.body;

    // Если пароль указан, хэшируем его
    let passwordHash: string | undefined;
    if (updates.password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(updates.password, saltRounds);
    }

    if (
      Object.keys(updates).filter((key) => updates[key as keyof UpdateAppUserInput] !== undefined && key !== 'password').length === 0 &&
      !passwordHash
    ) {
      throw new AppError('No fields to update', 400);
    }

    const user = await appUserRepository.update(
      parseInt(id),
      updates,
      passwordHash
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      throw new AppError('Username already exists', 409);
    }
    next(error);
  }
};

export const deleteAppUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять пользователей
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can delete users', 403);
    }

    const { id } = req.params;
    const deleted = await appUserRepository.delete(parseInt(id));

    if (!deleted) {
      throw new AppError('User not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

