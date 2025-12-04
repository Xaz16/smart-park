import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { CreateCameraInput, UpdateCameraInput } from '../types';
import { cameraRepository } from '../repositories/cameraRepository';

export const getAllCameras = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Поддерживаем фильтрацию по is_active через query параметр
    const isActiveParam = req.query.is_active;
    let isActive: boolean | undefined;
    
    if (isActiveParam !== undefined) {
      // Преобразуем строку в boolean
      isActive = isActiveParam === 'true';
    }
    
    const cameras = await cameraRepository.findAll(isActive);
    res.json({
      status: 'success',
      data: cameras,
    });
  } catch (error) {
    next(error);
  }
};

export const getCameraById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const camera = await cameraRepository.findById(parseInt(id));

    if (!camera) {
      throw new AppError('Камера не найдена', 404);
    }

    res.json({
      status: 'success',
      data: camera,
    });
  } catch (error) {
    next(error);
  }
};

export const createCamera = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Только суперадминистратор может создавать камеры', 403);
    }

    const data: CreateCameraInput = req.body;

    if (!data.name) {
      throw new AppError('Название обязательно для заполнения', 400);
    }

    const cameraType = data.camera_type || 'rtsp';
    if (cameraType === 'rtsp' && !data.rtsp_url) {
      throw new AppError('RTSP URL обязателен для RTSP камер', 400);
    }

    const camera = await cameraRepository.create(data);

    res.status(201).json({
      status: 'success',
      data: camera,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCamera = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Только суперадминистратор может обновлять камеры', 403);
    }

    const { id } = req.params;
    const updates: UpdateCameraInput = req.body;

    if (Object.keys(updates).filter((key) => updates[key as keyof UpdateCameraInput] !== undefined).length === 0) {
      throw new AppError('Нет полей для обновления', 400);
    }

    const camera = await cameraRepository.update(parseInt(id), updates);

    if (!camera) {
      throw new AppError('Камера не найдена', 404);
    }

    res.json({
      status: 'success',
      data: camera,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCamera = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Только суперадминистратор может удалять камеры', 403);
    }

    const { id } = req.params;
    const deleted = await cameraRepository.delete(parseInt(id));

    if (!deleted) {
      throw new AppError('Camera not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

