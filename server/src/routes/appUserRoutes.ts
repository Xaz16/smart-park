import { Router } from 'express';
import {
  getAllAppUsers,
  getAppUserById,
  createAppUser,
  updateAppUser,
  deleteAppUser,
} from '../controllers/appUserController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Все запросы требуют авторизации (проверка роли в контроллерах)
router.get('/', authenticate, getAllAppUsers);
router.get('/:id', authenticate, getAppUserById);
router.post('/', authenticate, createAppUser);
router.put('/:id', authenticate, updateAppUser);
router.delete('/:id', authenticate, deleteAppUser);

export default router;

