/**
 * Registro de usuario persistido no banco de dados.
 */
export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar: string | null;
  createdAt: string;
}

/**
 * Usuario retornado nas respostas da API (sem senha).
 */
export interface UserPublic {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}
