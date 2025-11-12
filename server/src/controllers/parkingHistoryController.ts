import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { CreateParkingHistoryInput } from '../types';
import { checkParkingAccessFromRequest } from '../utils/parkingAccess';
import { parkingHistoryRepository } from '../repositories/parkingHistoryRepository';

export const getAllParkingHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { parking_id, start_date, end_date } = req.query;
    const parkingId = parking_id ? parseInt(parking_id as string) : undefined;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Если указан parking_id и пользователь - администратор парковки, проверяем доступ
    if (parkingId && req.user && req.user.role === 'parking_administrator') {
      await checkParkingAccessFromRequest(req, parkingId);
    }

    const history = await parkingHistoryRepository.findAll(
      parkingId,
      start_date as string,
      end_date as string,
      userId,
      userRole
    );

    res.json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getParkingHistoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const history = await parkingHistoryRepository.findById(parseInt(id));

    if (!history) {
      throw new AppError('Parking history record not found', 404);
    }

    res.json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const createParkingHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const data: CreateParkingHistoryInput = req.body;

    if (!data.parking_id || !data.spots_state) {
      throw new AppError('parking_id and spots_state are required', 400);
    }

    if (!Array.isArray(data.spots_state)) {
      throw new AppError('spots_state must be an array', 400);
    }

    // Проверяем доступ к парковке
    await checkParkingAccessFromRequest(req, data.parking_id);

    const history = await parkingHistoryRepository.create(data);

    res.status(201).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteParkingHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = req.params;
    const historyId = parseInt(id);

    // Сначала получаем запись истории, чтобы проверить доступ
    const parkingId = await parkingHistoryRepository.getParkingId(historyId);

    if (!parkingId) {
      throw new AppError('Parking history record not found', 404);
    }

    // Проверяем доступ к парковке
    await checkParkingAccessFromRequest(req, parkingId);

    const deleted = await parkingHistoryRepository.delete(historyId);

    if (!deleted) {
      throw new AppError('Parking history record not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

