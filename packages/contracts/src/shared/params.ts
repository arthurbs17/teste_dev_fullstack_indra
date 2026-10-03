import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type IdParam = z.infer<typeof idParamSchema>;

/** Taxa entre 0 e 1 (ex.: 0.42 = 42%). A formatação fica com o frontend. */
export const rateSchema = z.number().min(0);
