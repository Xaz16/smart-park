import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { CreateParkingInput, UpdateParkingInput } from '../types';
import { parkingRepository } from '../repositories/parkingRepository';
import { userParkingRepository } from '../repositories/userParkingRepository';

export const getAllParkings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const parkings = await parkingRepository.findAll(userId, userRole);

    res.json({
      status: 'success',
      data: parkings,
    });
  } catch (error) {
    next(error);
  }
};

export const getParkingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const parking = await parkingRepository.findById(parseInt(id));

    if (!parking) {
      throw new AppError('Parking not found', 404);
    }

    res.json({
      status: 'success',
      data: parking,
    });
  } catch (error) {
    next(error);
  }
};

export const createParking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может создавать парковки
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can create parkings', 403);
    }

    const data: CreateParkingInput = req.body;

    if (!data.name || !data.address) {
      throw new AppError('Name and address are required', 400);
    }

    const parking = await parkingRepository.create(data);

    res.status(201).json({
      status: 'success',
      data: parking,
    });
  } catch (error) {
    next(error);
  }
};

export const updateParking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const parkingId = parseInt(id);

    // Проверяем доступ к парковке
    if (req.user.role === 'parking_administrator') {
      const hasAccess = await userParkingRepository.checkAccess(
        req.user.userId,
        parkingId
      );

      if (!hasAccess) {
        throw new AppError(
          'Access denied. You do not have permission to access this parking',
          403
        );
      }
    } else if (req.user.role !== 'service_admin') {
      throw new AppError('Insufficient permissions', 403);
    }

    const updates: UpdateParkingInput = req.body;

    if (Object.keys(updates).filter((key) => updates[key as keyof UpdateParkingInput] !== undefined).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const parking = await parkingRepository.update(parkingId, updates);

    if (!parking) {
      throw new AppError('Parking not found', 404);
    }

    res.json({
      status: 'success',
      data: parking,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteParking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять парковки
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can delete parkings', 403);
    }

    const { id } = req.params;
    const deleted = await parkingRepository.delete(parseInt(id));

    if (!deleted) {
      throw new AppError('Parking not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

