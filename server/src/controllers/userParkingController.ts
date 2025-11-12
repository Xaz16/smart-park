import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { userParkingRepository } from '../repositories/userParkingRepository';

export const getAllUserParkings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id, parking_id } = req.query;
    const userId = user_id ? parseInt(user_id as string) : undefined;
    const parkingId = parking_id ? parseInt(parking_id as string) : undefined;

    const relationships = await userParkingRepository.findAll(userId, parkingId);

    res.json({
      status: 'success',
      data: relationships,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserParkingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const relationship = await userParkingRepository.findById(parseInt(id));

    if (!relationship) {
      throw new AppError('User parking relationship not found', 404);
    }

    res.json({
      status: 'success',
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
};

export const createUserParking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может создавать связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage user-parking relationships', 403);
    }

    const { user_id, parking_id } = req.body;

    if (!user_id || !parking_id) {
      throw new AppError('user_id and parking_id are required', 400);
    }

    const relationship = await userParkingRepository.create(user_id, parking_id);

    res.status(201).json({
      status: 'success',
      data: relationship,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError('This user-parking relationship already exists', 409);
    }
    if (error.code === '23503') {
      // Foreign key constraint violation
      throw new AppError('User or parking not found', 404);
    }
    next(error);
  }
};

export const deleteUserParking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage user-parking relationships', 403);
    }

    const { id } = req.params;
    const deleted = await userParkingRepository.delete(parseInt(id));

    if (!deleted) {
      throw new AppError('User parking relationship not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const deleteUserParkingByRelation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage user-parking relationships', 403);
    }

    const { user_id, parking_id } = req.body;

    if (!user_id || !parking_id) {
      throw new AppError('user_id and parking_id are required', 400);
    }

    const deleted = await userParkingRepository.deleteByRelation(
      user_id,
      parking_id
    );

    if (!deleted) {
      throw new AppError('User parking relationship not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

