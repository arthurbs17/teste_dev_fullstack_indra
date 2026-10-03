import { z } from 'zod';
import { isoDateSchema } from '../shared/date';
import { rateSchema } from '../shared/params';
import {
  periodFieldsSchema,
  periodRefinementMessage,
  periodSchema,
  refinePeriod,
} from '../shared/period';

export const dailyCensusQuerySchema = periodFieldsSchema
  .extend({
    departmentId: z.coerce.number().int().positive().optional(),
  })
  .refine(refinePeriod, periodRefinementMessage);
export type DailyCensusQuery = z.infer<typeof dailyCensusQuerySchema>;

export const dailyCensusPointSchema = z.object({
  date: isoDateSchema,
  occupiedBeds: z.number().int(),
  occupancyRate: rateSchema,
  admissions: z.number().int(),
  discharges: z.number().int(),
});
export type DailyCensusPoint = z.infer<typeof dailyCensusPointSchema>;

export const dailyCensusSchema = z.object({
  period: periodSchema,
  departmentId: z.number().int().nullable(),
  totalBeds: z.number().int(),
  points: z.array(dailyCensusPointSchema),
});
export type DailyCensus = z.infer<typeof dailyCensusSchema>;
