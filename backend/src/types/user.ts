/**
 * Registro de usuario persistido no banco de dados.
 */
export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

/**
 * Usuario retornado nas respostas da API (sem senha).
 */
export interface UserPublic {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}
