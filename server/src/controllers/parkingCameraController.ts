import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { parkingCameraRepository } from '../repositories/parkingCameraRepository';

export const getAllParkingCameras = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { parking_id, camera_id } = req.query;
    const parkingId = parking_id ? parseInt(parking_id as string) : undefined;
    const cameraId = camera_id ? parseInt(camera_id as string) : undefined;

    const relationships = await parkingCameraRepository.findAll(
      parkingId,
      cameraId
    );

    res.json({
      status: 'success',
      data: relationships,
    });
  } catch (error) {
    next(error);
  }
};

export const getParkingCameraById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const relationship = await parkingCameraRepository.findById(parseInt(id));

    if (!relationship) {
      throw new AppError('Parking camera relationship not found', 404);
    }

    res.json({
      status: 'success',
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
};

export const createParkingCamera = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может создавать связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage parking-camera relationships', 403);
    }

    const { parking_id, camera_id } = req.body;

    if (!parking_id || !camera_id) {
      throw new AppError('parking_id and camera_id are required', 400);
    }

    const relationship = await parkingCameraRepository.create(
      parking_id,
      camera_id
    );

    res.status(201).json({
      status: 'success',
      data: relationship,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new AppError(
        'This parking-camera relationship already exists',
        409
      );
    }
    if (error.code === '23503') {
      // Foreign key constraint violation
      throw new AppError('Parking or camera not found', 404);
    }
    next(error);
  }
};

export const deleteParkingCamera = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage parking-camera relationships', 403);
    }

    const { id } = req.params;
    const deleted = await parkingCameraRepository.delete(parseInt(id));

    if (!deleted) {
      throw new AppError('Parking camera relationship not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const deleteParkingCameraByRelation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Только администратор сервиса может удалять связи
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can manage parking-camera relationships', 403);
    }

    const { parking_id, camera_id } = req.body;

    if (!parking_id || !camera_id) {
      throw new AppError('parking_id and camera_id are required', 400);
    }

    const deleted = await parkingCameraRepository.deleteByRelation(
      parking_id,
      camera_id
    );

    if (!deleted) {
      throw new AppError('Parking camera relationship not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

