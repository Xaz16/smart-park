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
    const isPublic = req.query.public === 'true' || !req.user;

    let parkings;
    if (isPublic) {
      parkings = await parkingRepository.findAllActive();
    } else {
      parkings = await parkingRepository.findAll(userId, userRole);
    }
    
    const parkingsWithAnalysis = parkings.map((parking) => {
      const analysis = cameraService.getParkingAnalysis(parking.id);
      const cameraInfo = cameraService.getParkingCameraInfo(parking.id);
      
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
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const isPublic = req.query.public === 'true' || !req.user;
    const parking = await parkingRepository.findById(parseInt(id));

    if (!parking) {
      throw new AppError('Парковка не найдена', 404);
    }

    if (userRole === 'service_admin') {
      // service_admin видит все парковки
    } else if (isPublic) {
      // Для публичных запросов показываем только активные парковки
      if (!parking.is_active) {
        throw new AppError('Парковка не найдена', 404);
      }
    } else if (userRole === 'parking_administrator') {
      // Для администратора парковки в админ-панели проверяем доступ
      const hasAccess = await userParkingRepository.checkAccess(
        userId!,
        parking.id
      );
      if (!hasAccess) {
        throw new AppError('Парковка не найдена', 404);
      }
    } else {
      // Для остальных неавторизованных пользователей только активные
      if (!parking.is_active) {
        throw new AppError('Парковка не найдена', 404);
      }
    }

    const analysis = cameraService.getParkingAnalysis(parking.id);
    const cameraInfo = cameraService.getParkingCameraInfo(parking.id);

    let hasAdminAccess = false;
    if (userRole === 'service_admin') {
      hasAdminAccess = true;
    } else if (userRole === 'parking_administrator' && userId) {
      hasAdminAccess = await userParkingRepository.checkAccess(userId, parking.id);
    }

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
        has_admin_access: hasAdminAccess,
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
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Только суперадминистратор может создавать парковки', 403);
    }

    const data: CreateParkingInput = req.body;

    if (!data.name || !data.address) {
      throw new AppError('Название и адрес обязательны для заполнения', 400);
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
      throw new AppError('Требуется авторизация', 401);
    }

    const { id } = req.params;
    const parkingId = parseInt(id);

    if (req.user.role === 'parking_administrator') {
      const hasAccess = await userParkingRepository.checkAccess(
        req.user.userId,
        parkingId
      );

      if (!hasAccess) {
        throw new AppError(
          'Доступ запрещен. У вас нет прав для доступа к этой парковке',
          403
        );
      }
    } else if (req.user.role !== 'service_admin') {
      throw new AppError('Недостаточно прав', 403);
    }

    const updates: UpdateParkingInput = req.body;

    if (Object.keys(updates).filter((key) => updates[key as keyof UpdateParkingInput] !== undefined).length === 0) {
      throw new AppError('Нет полей для обновления', 400);
    }

    const parking = await parkingRepository.update(parkingId, updates);

    if (!parking) {
      throw new AppError('Парковка не найдена', 404);
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
    if (!req.user || req.user.role !== 'service_admin') {
      throw new AppError('Только суперадминистратор может удалять парковки', 403);
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

