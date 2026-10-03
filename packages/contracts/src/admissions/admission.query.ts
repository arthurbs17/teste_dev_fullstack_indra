import { z } from 'zod';
import { isoDateSchema } from '../shared/date';
import { paginationQuerySchema } from '../shared/pagination';
import { dbIdSchema } from '../shared/params';
import { periodRefinementMessage, refinePeriod } from '../shared/period';
import { admissionStatusSchema } from './admission.enums';

export const admissionSortFields = [
  'admissionDate',
  'dischargeDate',
  'patientName',
  'departmentName',
  'lengthOfStay',
] as const;
export type AdmissionSortField = (typeof admissionSortFields)[number];

export const listAdmissionsQuerySchema = paginationQuerySchema
  .extend({
    status: admissionStatusSchema.optional(),
    departmentId: dbIdSchema.optional(),
    /** Filtra pela data de internação (inclusive). */
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    /** Busca por nome ou documento do paciente, ou diagnóstico. */
    search: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(admissionSortFields).default('admissionDate'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(refinePeriod, periodRefinementMessage);
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;
