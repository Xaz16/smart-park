import { Router } from 'express';
import {
  getAllParkingHistory,
  getParkingHistoryById,
  createParkingHistory,
  deleteParkingHistory,
} from '../controllers/parkingHistoryController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей)
router.get('/', optionalAuthenticate, getAllParkingHistory);
router.get('/:id', optionalAuthenticate, getParkingHistoryById);

// POST, DELETE требуют авторизации
router.post('/', authenticate, createParkingHistory);
router.delete('/:id', authenticate, deleteParkingHistory);

export default router;

