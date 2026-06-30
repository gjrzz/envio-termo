import type { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(result);
});

/**
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const users = authService.listUsers();
  const user = users.find((u) => u.id === userId);
  res.status(200).json(user);
});

/**
 * GET /api/users-management
 */
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = authService.listUsers();
  res.status(200).json(users);
});

/**
 * POST /api/users-management
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const user = await authService.createUser(name, email, password);
  res.status(201).json(user);
});

/**
 * PUT /api/users-management/:id
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;
  const user = authService.updateUser(id, name, email);
  res.status(200).json(user);
});

/**
 * DELETE /api/users-management/:id
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  authService.deleteUser(id);
  res.status(204).send();
});

/**
 * PUT /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(userId, currentPassword, newPassword);
  res.status(200).json({ message: 'Senha alterada com sucesso' });
});
