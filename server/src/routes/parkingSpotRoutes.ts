import { Router } from 'express';
import {
  getAllParkingSpots,
  getParkingSpotById,
  createParkingSpot,
  updateParkingSpot,
  deleteParkingSpot,
} from '../controllers/parkingSpotController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей)
router.get('/', optionalAuthenticate, getAllParkingSpots);
router.get('/:id', optionalAuthenticate, getParkingSpotById);

// POST, PUT, DELETE требуют авторизации
router.post('/', authenticate, createParkingSpot);
router.put('/:id', authenticate, updateParkingSpot);
router.delete('/:id', authenticate, deleteParkingSpot);

export default router;

