import { z } from 'zod';
import { isoDateSchema } from './date';

export const periodFieldsSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/** Garante from <= to quando os dois são informados. */
export const refinePeriod = <T extends { from?: string; to?: string }>(q: T) =>
  !q.from || !q.to || q.from <= q.to;

export const periodRefinementMessage = {
  message: '"from" deve ser menor ou igual a "to"',
  path: ['from'],
};

export const periodQuerySchema = periodFieldsSchema.refine(refinePeriod, periodRefinementMessage);
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export const periodSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});
export type Period = z.infer<typeof periodSchema>;
