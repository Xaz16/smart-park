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

router.get('/', optionalAuthenticate, getAllParkings);
router.get('/:id', optionalAuthenticate, getParkingById);

router.post('/', authenticate, createParking);
router.put('/:id', authenticate, updateParking);
router.delete('/:id', authenticate, deleteParking);

export default router;

