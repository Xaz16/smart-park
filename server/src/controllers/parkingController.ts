import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { CreateParkingInput, UpdateParkingInput } from '../types';
import { parkingRepository } from '../repositories/parkingRepository';
import { userParkingRepository } from '../repositories/userParkingRepository';
import { cameraService } from '../services/cameraService';

export const getAllParkings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const parkings = await parkingRepository.findAll(userId, userRole);
    
    // Добавляем результаты анализа от NN и информацию о камере для каждой парковки
    const parkingsWithAnalysis = parkings.map((parking) => {
      const analysis = cameraService.getParkingAnalysis(parking.id);
      const cameraInfo = cameraService.getParkingCameraInfo(parking.id);
      
      // Логирование для отладки синхронизации
      if (analysis && cameraInfo) {
        console.log(
          `[ParkingController] Parking ${parking.id}: ` +
          `Image analyzed: ${analysis.imageName}, ` +
          `Image URL: ${cameraInfo.imageUrl}, ` +
          `Free: ${analysis.result.free_spots}/${analysis.result.total_spots}, ` +
          `Occupied: ${analysis.result.occupied_spots}/${analysis.result.total_spots}`
        );
      }
      
      return {
        ...parking,
        analysis: analysis
          ? {
              spots_state: analysis.result.spots_state,
              total_spots: analysis.result.total_spots,
              free_spots: analysis.result.free_spots,
              occupied_spots: analysis.result.occupied_spots,
              slot_details: analysis.result.slot_details || [],
              last_update: analysis.lastUpdate,
              image_name: analysis.imageName, // Добавляем имя изображения для отладки
            }
          : null,
        camera: cameraInfo
          ? {
              id: cameraInfo.cameraId,
              name: cameraInfo.cameraName,
              type: cameraInfo.cameraType,
              image_url: cameraInfo.imageUrl,
            }
          : null,
      };
    });

    res.json({
      status: 'success',
      data: parkingsWithAnalysis,
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

    // Добавляем результаты анализа от NN и информацию о камере для этой парковки
    const analysis = cameraService.getParkingAnalysis(parking.id);
    const cameraInfo = cameraService.getParkingCameraInfo(parking.id);

    // Логирование для отладки синхронизации
    if (analysis && cameraInfo) {
      console.log(
        `[ParkingController] GET /api/parkings/${parking.id}: ` +
        `Image analyzed: ${analysis.imageName}, ` +
        `Image URL: ${cameraInfo.imageUrl}, ` +
        `Free: ${analysis.result.free_spots}/${analysis.result.total_spots}, ` +
        `Occupied: ${analysis.result.occupied_spots}/${analysis.result.total_spots}`
      );
    }

    res.json({
      status: 'success',
      data: {
        ...parking,
        analysis: analysis
          ? {
              spots_state: analysis.result.spots_state,
              total_spots: analysis.result.total_spots,
              free_spots: analysis.result.free_spots,
              occupied_spots: analysis.result.occupied_spots,
              slot_details: analysis.result.slot_details || [],
              last_update: analysis.lastUpdate,
              image_name: analysis.imageName, // Добавляем имя изображения для отладки
            }
          : null,
        camera: cameraInfo
          ? {
              id: cameraInfo.cameraId,
              name: cameraInfo.cameraName,
              type: cameraInfo.cameraType,
              image_url: cameraInfo.imageUrl,
            }
          : null,
      },
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

