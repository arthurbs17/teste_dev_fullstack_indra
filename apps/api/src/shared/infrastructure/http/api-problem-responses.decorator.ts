import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsDto } from './problem-details.dto';

const DESCRIPTIONS = {
  400: 'Parâmetros inválidos; "errors" lista cada campo e o motivo',
  404: 'Recurso não encontrado',
  422: 'Parâmetros bem formados que violam uma regra de negócio',
  500: 'Erro interno (sem detalhes, registrado no log)',
} as const;

export type ProblemStatus = Exclude<keyof typeof DESCRIPTIONS, 500>;

/**
 * Documenta no Swagger as respostas de erro de uma rota (sempre inclui o 500).
 * O corpo segue o ProblemDetails do contrato, que é o que o
 * ProblemDetailsFilter devolve em application/problem+json.
 */
export function ApiProblemResponses(...statuses: ProblemStatus[]) {
  const problemSchema = { $ref: getSchemaPath(ProblemDetailsDto.Output) };

  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto.Output),
    ...[...statuses, 500 as const].map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status],
        content: { 'application/problem+json': { schema: problemSchema } },
      }),
    ),
  );
}
