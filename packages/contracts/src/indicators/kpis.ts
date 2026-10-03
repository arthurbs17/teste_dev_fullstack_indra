import { z } from 'zod';
import { isoDateTimeSchema } from '../shared/date';
import { rateSchema } from '../shared/params';
import { periodQuerySchema, periodSchema } from '../shared/period';

export const kpisQuerySchema = periodQuerySchema;
export type KpisQuery = z.infer<typeof kpisQuerySchema>;

export const kpisSchema = z.object({
  period: periodSchema,
  referenceDate: isoDateTimeSchema,
  /** Ocupação atual (internações ativas / total de leitos). */
  occupancy: z.object({
    occupiedBeds: z.number().int(),
    totalBeds: z.number().int(),
    rate: rateSchema,
  }),
  activeAdmissions: z.number().int(),
  admissionsInPeriod: z.number().int(),
  dischargesInPeriod: z.number().int(),
  /** Média em dias das internações encerradas no período; null se não houver. */
  averageLengthOfStayDays: z.number().nullable(),
  /** Óbitos / internações encerradas no período; null se não houver. */
  mortalityRate: rateSchema.nullable(),
  pendingExams: z.number().int(),
  /** Média em horas entre solicitação e resultado dos exames do período. */
  averageExamTurnaroundHours: z.number().nullable(),
});
export type Kpis = z.infer<typeof kpisSchema>;
