import { z } from 'zod';

/** Maior valor de uma coluna INTEGER do Postgres (int4). */
export const INT4_MAX = 2_147_483_647;

/**
 * Id de uma tabela do banco vindo da URL. O limite evita que valores acima de
 * int4 cheguem ao banco e virem erro 500 em vez de 400.
 */
export const dbIdSchema = z.coerce.number().int().positive().max(INT4_MAX);

export const idParamSchema = z.object({
  id: dbIdSchema,
});
export type IdParam = z.infer<typeof idParamSchema>;

/** Taxa entre 0 e 1 (ex.: 0.42 = 42%). A formatação fica com o frontend. */
export const rateSchema = z.number().min(0);
