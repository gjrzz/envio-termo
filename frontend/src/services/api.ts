import axios, { AxiosError } from 'axios';
import type {
  AssignedAssetsResult,
  GenerateTermInput,
  GenerateTermResult,
  MondayEmployee,
  SendTermInput,
  TermRecord,
} from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
});

// Injeta o token JWT em todas as requisicoes caso exista no localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Logout automatico quando o token expira (401) + normalizar erros
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; details?: unknown }>) => {
    // Redirect para login se token expirou (exceto na propria rota de login)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const statusCode = error.response?.status;
    const message =
      error.response?.data?.error ??
      (error.request
        ? 'Nao foi possivel conectar ao servidor. Verifique sua conexao.'
        : error.message);

    return Promise.reject(new ApiError(message, statusCode, error.response?.data?.details));
  },
);

/**
 * Erro normalizado lancado pelas chamadas a API, com a mensagem amigavel
 * vinda do backend (quando disponivel).
 */
export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Busca o colaborador e os equipamentos atribuidos a ele no GLPI a partir
 * do email corporativo.
 */
export async function getAssignedAssets(email: string): Promise<AssignedAssetsResult> {
  const response = await apiClient.get<AssignedAssetsResult>(
    `/users/${encodeURIComponent(email)}/assets`,
  );

  return response.data;
}

/**
 * Busca os dados do colaborador (nome, CPF, email e telefone) na board do
 * Monday.com a partir do email corporativo.
 */
export async function getMondayEmployee(email: string): Promise<MondayEmployee> {
  const response = await apiClient.get<MondayEmployee>(
    `/monday/employee/${encodeURIComponent(email)}`,
  );

  return response.data;
}

/**
 * Envia o termo de responsabilidade com os equipamentos selecionados,
 * criando o envelope no DocuSign.
 */
export async function sendTerm(input: SendTermInput): Promise<TermRecord> {
  const response = await apiClient.post<TermRecord>('/terms/send', input);

  return response.data;
}

/**
 * Lista o historico de termos enviados.
 */
export async function listTerms(): Promise<TermRecord[]> {
  const response = await apiClient.get<TermRecord[]>('/terms');

  return response.data;
}

/**
 * Retorna os detalhes de um termo especifico.
 */
export async function getTermById(id: number): Promise<TermRecord> {
  const response = await apiClient.get<TermRecord>(`/terms/${id}`);

  return response.data;
}

/**
 * Gera o DOCX do Termo de Responsabilidade a partir dos dados do
 * colaborador e dos equipamentos selecionados, salvando localmente.
 */
export async function generateTerm(input: GenerateTermInput): Promise<GenerateTermResult> {
  const response = await apiClient.post<GenerateTermResult>('/terms/generate', input);

  return response.data;
}
