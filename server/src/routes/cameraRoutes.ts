import { Router } from 'express';
import {
  getAllCameras,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
} from '../controllers/cameraController';
import { optionalAuthenticate, authenticate } from '../middleware/auth';

const router = Router();

// GET запросы доступны всем (включая водителей)
router.get('/', optionalAuthenticate, getAllCameras);
router.get('/:id', optionalAuthenticate, getCameraById);

// POST, PUT, DELETE требуют авторизации (проверка роли в контроллерах)
router.post('/', authenticate, createCamera);
router.put('/:id', authenticate, updateCamera);
router.delete('/:id', authenticate, deleteCamera);

export default router;

