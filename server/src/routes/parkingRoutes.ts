import { Router } from 'express';
import {
  getAllParkings,
  getParkingById,
  createParking,
  updateParking,
  deleteParking,
} from '../controllers/parkingController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей), но опциональная аутентификация
// позволяет показывать администраторам парковки только их парковки
router.get('/', optionalAuthenticate, getAllParkings);
router.get('/:id', optionalAuthenticate, getParkingById);

// POST, PUT, DELETE требуют авторизации
router.post('/', authenticate, createParking);
router.put('/:id', authenticate, updateParking);
router.delete('/:id', authenticate, deleteParking);

export default router;

