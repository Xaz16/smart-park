import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { nnService } from '../services/nnService';
import { parkingRepository } from '../repositories/parkingRepository';
import multer from 'multer';

// Настройка multer для обработки файлов в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp'
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          400
        )
      );
    }
  },
});

/**
 * Middleware для обработки загрузки файла
 */
export const uploadImage = upload.single('image');

/**
 * Анализирует изображение парковки и возвращает состояние парковочных мест
 * POST /api/parking-analysis?parking_id=1
 */
export const analyzeParkingImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    const parkingId = req.query.parking_id 
      ? parseInt(req.query.parking_id as string, 10)
      : null;

    if (!parkingId || isNaN(parkingId)) {
      throw new AppError('parking_id query parameter is required', 400);
    }

    const parking = await parkingRepository.findById(parkingId);
    if (!parking) {
      throw new AppError(`Parking with id ${parkingId} not found`, 404);
    }

    if (!parking.layout) {
      throw new AppError(`No layout found for parking ${parkingId}`, 400);
    }

    const imageBuffer = req.file.buffer;
    const filename = req.file.originalname;

    // Вызываем NN сервис для анализа изображения с разметкой
    const result = await nnService.predictImage(
      imageBuffer,
      parking.layout as Record<string, any>,
      filename
    );

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(
          error instanceof Error
            ? error.message
            : 'Failed to analyze parking image',
          500
        )
      );
    }
  }
};

/**
 * Анализирует изображение парковки в base64 формате
 * POST /api/parking-analysis/base64
 * Body: { "image": "...", "parking_id": 1 }
 */
export const analyzeParkingImageBase64 = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { image, parking_id } = req.body;

    if (!image) {
      throw new AppError(
        'No image data provided. Send JSON with "image" field containing base64 string.',
        400
      );
    }

    if (typeof image !== 'string') {
      throw new AppError('Image must be a base64 string', 400);
    }

    if (!parking_id || typeof parking_id !== 'number') {
      throw new AppError('parking_id is required and must be a number', 400);
    }

    const parking = await parkingRepository.findById(parking_id);
    if (!parking) {
      throw new AppError(`Parking with id ${parking_id} not found`, 404);
    }

    if (!parking.layout) {
      throw new AppError(`No layout found for parking ${parking_id}`, 400);
    }

    // Вызываем NN сервис для анализа изображения с разметкой
    const result = await nnService.predictImageBase64(
      image,
      parking.layout as Record<string, any>
    );

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(
          error instanceof Error
            ? error.message
            : 'Failed to analyze parking image',
          500
        )
      );
    }
  }
};

/**
 * Проверяет доступность NN сервиса
 * GET /api/parking-analysis/health
 */
export const checkNNServiceHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isHealthy = await nnService.healthCheck();

    if (!isHealthy) {
      throw new AppError('NN Service is not available', 503);
    }

    res.json({
      status: 'success',
      data: {
        nn_service: 'available',
      },
    });
  } catch (error) {
    next(error);
  }
};

