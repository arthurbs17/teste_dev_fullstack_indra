import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsDto } from './problem-details.dto';

const DESCRIPTIONS = {
  400: 'Parâmetros inválidos; "errors" lista cada campo e o motivo',
  404: 'Recurso não encontrado',
  422: 'Parâmetros bem formados que violam uma regra de negócio',
  429: 'Limite de requisições por minuto excedido; aguarde o tempo indicado em Retry-After',
  500: 'Erro interno (sem detalhes, registrado no log)',
} as const;

export type ProblemStatus = Exclude<keyof typeof DESCRIPTIONS, 429 | 500>;

/**
 * Documenta no Swagger as respostas de erro de uma rota (sempre inclui 429 e 500).
 * O corpo segue o ProblemDetails do contrato, que é o que o
 * ProblemDetailsFilter devolve em application/problem+json.
 */
export function ApiProblemResponses(...statuses: ProblemStatus[]) {
  const problemSchema = { $ref: getSchemaPath(ProblemDetailsDto.Output) };

  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto.Output),
    ...[...statuses, 429 as const, 500 as const].map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status],
        content: { 'application/problem+json': { schema: problemSchema } },
      }),
    ),
  );
}
