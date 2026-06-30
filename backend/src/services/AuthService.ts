import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { userRepository } from '../repositories/UserRepository';
import type { UserPublic, UserRecord } from '../types/user';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

/**
 * Servico de autenticacao e gerenciamento de usuarios.
 */
export class AuthService {
  private toPublic(user: UserRecord): UserPublic {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Cria o primeiro usuario admin se o banco estiver vazio.
   */
  public async ensureDefaultUser(): Promise<void> {
    if (userRepository.count() === 0) {
      const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
      userRepository.create('Administrador', 'admin@montebravo.com.br', hashedPassword);
    }
  }

  /**
   * Autentica um usuario pelo email e senha, retornando o token JWT.
   */
  public async login(email: string, password: string): Promise<{ token: string; user: UserPublic }> {
    const user = userRepository.findByEmail(email);

    if (!user) {
      throw AppError.unauthorized('Email ou senha incorretos');
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw AppError.unauthorized('Email ou senha incorretos');
    }

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    return { token, user: this.toPublic(user) };
  }

  /**
   * Verifica e decodifica um token JWT, retornando o userId.
   */
  public verifyToken(token: string): { userId: number } {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number };
      return payload;
    } catch {
      throw AppError.unauthorized('Token invalido ou expirado');
    }
  }

  /**
   * Registra um novo usuario.
   */
  public async createUser(name: string, email: string, password: string): Promise<UserPublic> {
    const existing = userRepository.findByEmail(email);

    if (existing) {
      throw AppError.badRequest('Ja existe um usuario com este email');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = userRepository.create(name, email, hashedPassword);

    return this.toPublic(user);
  }

  /**
   * Lista todos os usuarios (sem senha).
   */
  public listUsers(): UserPublic[] {
    return userRepository.findAll().map(this.toPublic);
  }

  /**
   * Atualiza nome e email de um usuario.
   */
  public updateUser(id: number, name: string, email: string): UserPublic {
    const user = userRepository.findById(id);

    if (!user) {
      throw AppError.notFound('Usuario nao encontrado');
    }

    const emailConflict = userRepository.findByEmail(email);

    if (emailConflict && emailConflict.id !== id) {
      throw AppError.badRequest('Ja existe outro usuario com este email');
    }

    userRepository.update(id, name, email);

    const updated = userRepository.findById(id)!;
    return this.toPublic(updated);
  }

  /**
   * Altera a senha de um usuario (requer senha atual).
   */
  public async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = userRepository.findById(id);

    if (!user) {
      throw AppError.notFound('Usuario nao encontrado');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      throw AppError.badRequest('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    userRepository.updatePassword(id, hashedPassword);
  }

  /**
   * Exclui um usuario pelo ID.
   */
  public deleteUser(id: number): void {
    const user = userRepository.findById(id);

    if (!user) {
      throw AppError.notFound('Usuario nao encontrado');
    }

    userRepository.delete(id);
  }
}

export const authService = new AuthService();
