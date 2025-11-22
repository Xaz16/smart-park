import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { nnService } from '../services/nnService';
import multer from 'multer';

// Настройка multer для обработки файлов в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем только изображения
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
 * POST /api/parking-analysis
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

    const imageBuffer = req.file.buffer;
    const filename = req.file.originalname;

    // Вызываем NN сервис для анализа изображения
    const result = await nnService.predictImage(imageBuffer, filename);

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
 */
export const analyzeParkingImageBase64 = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { image } = req.body;

    if (!image) {
      throw new AppError(
        'No image data provided. Send JSON with "image" field containing base64 string.',
        400
      );
    }

    if (typeof image !== 'string') {
      throw new AppError('Image must be a base64 string', 400);
    }

    // Вызываем NN сервис для анализа изображения
    const result = await nnService.predictImageBase64(image);

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

