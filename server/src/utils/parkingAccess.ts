import { Request } from 'express';
import { AppError } from '../middleware/errorHandler';
import { userParkingRepository } from '../repositories/userParkingRepository';

/**
 * Проверяет, имеет ли пользователь доступ к парковке
 * @param userId ID пользователя
 * @param parkingId ID парковки
 * @param userRole Роль пользователя
 * @returns true, если доступ разрешен, иначе выбрасывает ошибку
 */
export const checkParkingAccess = async (
  userId: number,
  parkingId: number,
  userRole: string
): Promise<boolean> => {
  // Администратор сервиса имеет доступ ко всем парковкам
  if (userRole === 'service_admin') {
    return true;
  }

  // Для администратора парковки проверяем доступ через таблицу user_parking
  if (userRole === 'parking_administrator') {
    const hasAccess = await userParkingRepository.checkAccess(userId, parkingId);

    if (!hasAccess) {
      throw new AppError(
        'Access denied. You do not have permission to access this parking',
        403
      );
    }

    return true;
  }

  throw new AppError('Insufficient permissions', 403);
};

/**
 * Проверяет доступ к парковке на основе данных из Request
 */
export const checkParkingAccessFromRequest = async (
  req: Request,
  parkingId: number | string
): Promise<boolean> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const parkingIdNum = typeof parkingId === 'string' ? parseInt(parkingId) : parkingId;
  return checkParkingAccess(req.user.userId, parkingIdNum, req.user.role);
};

