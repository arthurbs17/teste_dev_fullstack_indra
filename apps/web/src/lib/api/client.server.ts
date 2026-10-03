import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ProblemDetails, problemDetailsSchema } from '@hospital/contracts';
import { z } from 'zod';

const REQUEST_TIMEOUT_MS = 8_000;

/** Erro de uma resposta não-2xx da API, com o corpo problem+json quando disponível. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `A API respondeu com status ${status}.`);
    this.name = 'ApiError';
  }
}

let dotEnvLoaded = false;

/**
 * URL da API, lida a cada chamada (nunca no escopo do módulo) para não vazar
 * para o bundle do navegador. Em desenvolvimento, carrega o .env da raiz do
 * monorepo; no Docker, a variável chega pelo ambiente do container.
 */
export function apiBaseUrl(): string {
  if (!process.env['API_URL'] && !dotEnvLoaded) {
    dotEnvLoaded = true;
    const rootEnv = resolve(process.cwd(), '../../.env');
    if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  }
  const parsed = z.url().safeParse(process.env['API_URL']);
  if (!parsed.success) {
    throw new Error('API_URL não definida ou inválida (veja .env.example).');
  }
  return parsed.data.replace(/\/+$/, '');
}

export type QueryParams = Record<string, string | number | undefined>;

/**
 * GET na API validando a resposta contra o schema do contrato. Uma resposta
 * fora do contrato é tratada como erro, em vez de chegar quebrada na tela.
 */
export async function apiGet<T extends z.ZodType>(
  path: string,
  schema: T,
  query: QueryParams = {},
): Promise<z.infer<T>> {
  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new Error('Não foi possível conectar à API. Verifique se ela está no ar.', { cause });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const problem = problemDetailsSchema.safeParse(body);
    throw new ApiError(response.status, problem.success ? problem.data : null);
  }

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    console.error(`Resposta de ${path} fora do contrato`, z.prettifyError(result.error));
    throw new Error('A API respondeu em um formato inesperado.');
  }
  return result.data;
}
