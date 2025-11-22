import { Router } from 'express';
import {
  getCameraServiceStatus,
  startCameraService,
  stopCameraService,
} from '../controllers/cameraServiceController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Получить статус сервиса камеры (публичный доступ)
router.get('/status', getCameraServiceStatus);

// Запустить сервис камеры (требует авторизации)
router.post('/start', optionalAuthenticate, startCameraService);

// Остановить сервис камеры (требует авторизации)
router.post('/stop', optionalAuthenticate, stopCameraService);

export default router;

