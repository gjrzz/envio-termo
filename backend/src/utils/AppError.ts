/**
 * Erro de aplicacao com status HTTP associado, usado pelo middleware global
 * de tratamento de erros para retornar respostas consistentes ao frontend.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(message: string, details?: unknown): AppError {
    return new AppError(message, 404, details);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static unauthorized(message: string, details?: unknown): AppError {
    return new AppError(message, 401, details);
  }

  static badGateway(message: string, details?: unknown): AppError {
    return new AppError(message, 502, details);
  }
}
