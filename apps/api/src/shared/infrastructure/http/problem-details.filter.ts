import type { ProblemDetails } from '@hospital/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { BusinessRuleViolationError, DomainError, NotFoundError } from '../../domain/domain-error';

/**
 * Adapter HTTP de erros: traduz qualquer exceção para o formato
 * application/problem+json (RFC 9457). Erros inesperados viram 500 sem expor
 * detalhes internos; o detalhe vai apenas para o log.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const problem = { ...this.toProblem(exception), instance: request.originalUrl };

    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;
      return {
        ...base(HttpStatus.BAD_REQUEST, 'Parâmetros inválidos'),
        detail: 'Um ou mais parâmetros da requisição não passaram na validação.',
        errors: zodError.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }

    if (exception instanceof NotFoundError) {
      return { ...base(HttpStatus.NOT_FOUND, 'Recurso não encontrado'), detail: exception.message };
    }

    if (exception instanceof BusinessRuleViolationError) {
      return {
        ...base(HttpStatus.UNPROCESSABLE_ENTITY, 'Regra de negócio violada'),
        detail: exception.message,
      };
    }

    if (exception instanceof DomainError) {
      return { ...base(HttpStatus.BAD_REQUEST, 'Requisição inválida'), detail: exception.message };
    }

    if (exception instanceof ZodSerializationException) {
      // A resposta não bate com o contrato: é bug da api, não do cliente.
      this.logger.error('Resposta fora do contrato', String(exception.getZodError()));
      return base(HttpStatus.INTERNAL_SERVER_ERROR, 'Erro interno');
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return {
          ...base(status, httpTitle(status)),
          detail: 'Muitas requisições em pouco tempo. Tente novamente em instantes.',
        };
      }
      return { ...base(status, httpTitle(status)), detail: httpDetail(exception) };
    }

    this.logger.error(
      'Erro não tratado',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return base(HttpStatus.INTERNAL_SERVER_ERROR, 'Erro interno');
  }
}

function base(status: number, title: string): ProblemDetails {
  return { type: 'about:blank', title, status };
}

function httpTitle(status: number): string {
  if (status === HttpStatus.NOT_FOUND) return 'Recurso não encontrado';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'Muitas requisições';
  if (status >= 500) return 'Erro interno';
  return 'Requisição inválida';
}

function httpDetail(exception: HttpException): string | undefined {
  const body = exception.getResponse();
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body as { message: unknown };
    return Array.isArray(message) ? message.join('; ') : String(message);
  }
  return undefined;
}
