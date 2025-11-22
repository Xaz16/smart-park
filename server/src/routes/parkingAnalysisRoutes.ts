import { Router } from 'express';
import {
  analyzeParkingImage,
  analyzeParkingImageBase64,
  checkNNServiceHealth,
  uploadImage,
} from '../controllers/parkingAnalysisController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Health check для NN сервиса (публичный доступ)
router.get('/health', checkNNServiceHealth);

// Анализ изображения через загрузку файла (требует авторизации)
router.post(
  '/',
  optionalAuthenticate,
  uploadImage,
  analyzeParkingImage
);

// Анализ изображения через base64 (требует авторизации)
router.post(
  '/base64',
  optionalAuthenticate,
  analyzeParkingImageBase64
);

export default router;

