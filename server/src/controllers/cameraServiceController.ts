import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { cameraService } from '../services/cameraService';

/**
 * Получает текущий статус сервиса камеры
 * GET /api/camera-service/status
 */
export const getCameraServiceStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = cameraService.getStatus();

    res.json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Запускает сервис камеры
 * POST /api/camera-service/start
 */
export const startCameraService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await cameraService.start();

    const status = cameraService.getStatus();

    res.json({
      status: 'success',
      message: 'Camera service started',
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Останавливает сервис камеры
 * POST /api/camera-service/stop
 */
export const stopCameraService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    cameraService.stop();

    res.json({
      status: 'success',
      message: 'Camera service stopped',
      data: cameraService.getStatus(),
    });
  } catch (error) {
    next(error);
  }
};

