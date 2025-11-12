import { Router } from 'express';
import {
  getAllParkingCameras,
  getParkingCameraById,
  createParkingCamera,
  deleteParkingCamera,
  deleteParkingCameraByRelation,
} from '../controllers/parkingCameraController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей)
router.get('/', optionalAuthenticate, getAllParkingCameras);
router.get('/:id', optionalAuthenticate, getParkingCameraById);

// POST, DELETE требуют авторизации (проверка роли в контроллерах)
router.post('/', authenticate, createParkingCamera);
router.delete('/relation/remove', authenticate, deleteParkingCameraByRelation);
router.delete('/:id', authenticate, deleteParkingCamera);

export default router;

