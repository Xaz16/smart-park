import { Router } from 'express';
import {
  getAllUserParkings,
  getUserParkingById,
  createUserParking,
  deleteUserParking,
  deleteUserParkingByRelation,
} from '../controllers/userParkingController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей)
router.get('/', optionalAuthenticate, getAllUserParkings);
router.get('/:id', optionalAuthenticate, getUserParkingById);

// POST, DELETE требуют авторизации (проверка роли в контроллерах)
router.post('/', authenticate, createUserParking);
router.delete('/relation/remove', authenticate, deleteUserParkingByRelation);
router.delete('/:id', authenticate, deleteUserParking);

export default router;

