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
    const cameras = await cameraRepository.findAll();
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
      throw new AppError('Camera not found', 404);
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
    // Только администратор сервиса может создавать камеры
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can create cameras', 403);
    }

    const data: CreateCameraInput = req.body;

    if (!data.name) {
      throw new AppError('Name is required', 400);
    }

    // Для rtsp камер rtsp_url обязателен
    const cameraType = data.camera_type || 'rtsp';
    if (cameraType === 'rtsp' && !data.rtsp_url) {
      throw new AppError('rtsp_url is required for rtsp cameras', 400);
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
    // Только администратор сервиса может обновлять камеры
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can update cameras', 403);
    }

    const { id } = req.params;
    const updates: UpdateCameraInput = req.body;

    if (Object.keys(updates).filter((key) => updates[key as keyof UpdateCameraInput] !== undefined).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const camera = await cameraRepository.update(parseInt(id), updates);

    if (!camera) {
      throw new AppError('Camera not found', 404);
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
    // Только администратор сервиса может удалять камеры
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Only service admin can delete cameras', 403);
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

