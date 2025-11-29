import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { JWTPayload, UserRole } from '../types';

// Расширяем тип Request для хранения информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Опциональная аутентификация - устанавливает req.user, если токен предоставлен, но не требует его
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Убираем 'Bearer '

      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Если токен невалидный, просто не устанавливаем req.user
        // Это позволяет неавторизованным пользователям (водителям) использовать API
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Обязательная аутентификация - требует валидный токен
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Требуется токен авторизации', 401);
    }

    const token = authHeader.substring(7); // Убираем 'Bearer '

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError('Недействительный или истекший токен', 401);
    }
  } catch (error) {
    next(error);
  }
};

// Middleware для проверки роли
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Требуется авторизация', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'Недостаточно прав. Требуемая роль: ' + allowedRoles.join(' или '),
          403
        )
      );
    }

    next();
  };
};

// Middleware для проверки, что пользователь - администратор сервиса
export const requireServiceAdmin = requireRole('service_admin');

// Middleware для проверки, что пользователь - администратор парковки
export const requireParkingAdmin = requireRole('parking_administrator');

// Middleware для проверки доступа к парковке (для администраторов парковки)
export const checkParkingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Требуется авторизация', 401));
    }

    // Администратор сервиса имеет доступ ко всем парковкам
    if (req.user.role === 'service_admin') {
      return next();
    }

    // Для администратора парковки проверяем доступ
    if (req.user.role === 'parking_administrator') {
      const parkingId = req.params.id || req.body.parking_id || req.query.parking_id;

      if (!parkingId) {
        return next(new AppError('Требуется ID парковки', 400));
      }

      // Проверяем, есть ли у пользователя доступ к этой парковке
      const pool = (await import('../config/database')).default;
      const result = await pool.query(
        'SELECT * FROM user_parking WHERE user_id = $1 AND parking_id = $2',
        [req.user.userId, parkingId]
      );

      if (result.rows.length === 0) {
        return next(
          new AppError('Доступ запрещен. У вас нет прав для доступа к этой парковке', 403)
        );
      }

      return next();
    }

    return next(new AppError('Недостаточно прав', 403));
  } catch (error) {
    next(error);
  }
};

