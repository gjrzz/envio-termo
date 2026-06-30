import { Router } from 'express';
import {
  login,
  getMe,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Publico
router.post('/auth/login', login);

// Protegido
router.get('/auth/me', requireAuth, getMe);
router.put('/auth/change-password', requireAuth, changePassword);

// CRUD de usuarios (protegido)
router.get('/users-management', requireAuth, listUsers);
router.post('/users-management', requireAuth, createUser);
router.put('/users-management/:id', requireAuth, updateUser);
router.delete('/users-management/:id', requireAuth, deleteUser);

export default router;
