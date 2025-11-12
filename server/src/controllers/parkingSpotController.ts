import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import {
  CreateParkingSpotInput,
  UpdateParkingSpotInput,
} from '../types';
import { checkParkingAccessFromRequest } from '../utils/parkingAccess';
import { parkingSpotRepository } from '../repositories/parkingSpotRepository';

export const getAllParkingSpots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { parking_id } = req.query;
    const parkingId = parking_id ? parseInt(parking_id as string) : undefined;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Если указан parking_id и пользователь - администратор парковки, проверяем доступ
    if (parkingId && req.user && req.user.role === 'parking_administrator') {
      await checkParkingAccessFromRequest(req, parkingId);
    }

    const spots = await parkingSpotRepository.findAll(
      parkingId,
      userId,
      userRole
    );

    res.json({
      status: 'success',
      data: spots,
    });
  } catch (error) {
    next(error);
  }
};

export const getParkingSpotById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const spot = await parkingSpotRepository.findById(parseInt(id));

    if (!spot) {
      throw new AppError('Parking spot not found', 404);
    }

    res.json({
      status: 'success',
      data: spot,
    });
  } catch (error) {
    next(error);
  }
};

export const createParkingSpot = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const data: CreateParkingSpotInput = req.body;

    if (!data.parking_id || !data.spot_number || !data.coordinates) {
      throw new AppError(
        'parking_id, spot_number, and coordinates are required',
        400
      );
    }

    // Проверяем доступ к парковке
    await checkParkingAccessFromRequest(req, data.parking_id);

    const spot = await parkingSpotRepository.create(data);

    res.status(201).json({
      status: 'success',
      data: spot,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError(
        'Parking spot with this number already exists for this parking',
        409
      );
    }
    next(error);
  }
};

export const updateParkingSpot = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const spotId = parseInt(id);

    // Сначала получаем парковочное место, чтобы проверить доступ
    const parkingId = await parkingSpotRepository.getParkingId(spotId);

    if (!parkingId) {
      throw new AppError('Parking spot not found', 404);
    }

    // Проверяем доступ к парковке
    await checkParkingAccessFromRequest(req, parkingId);

    const updates: UpdateParkingSpotInput = req.body;

    if (Object.keys(updates).filter((key) => updates[key as keyof UpdateParkingSpotInput] !== undefined).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const spot = await parkingSpotRepository.update(spotId, updates);

    if (!spot) {
      throw new AppError('Parking spot not found', 404);
    }

    res.json({
      status: 'success',
      data: spot,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      throw new AppError(
        'Parking spot with this number already exists for this parking',
        409
      );
    }
    next(error);
  }
};

export const deleteParkingSpot = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const spotId = parseInt(id);

    // Сначала получаем парковочное место, чтобы проверить доступ
    const parkingId = await parkingSpotRepository.getParkingId(spotId);

    if (!parkingId) {
      throw new AppError('Parking spot not found', 404);
    }

    // Проверяем доступ к парковке
    await checkParkingAccessFromRequest(req, parkingId);

    const deleted = await parkingSpotRepository.delete(spotId);

    if (!deleted) {
      throw new AppError('Parking spot not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

