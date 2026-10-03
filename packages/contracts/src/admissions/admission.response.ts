import { z } from 'zod';
import { isoDateSchema, isoDateTimeSchema } from '../shared/date';
import { paginatedSchema } from '../shared/pagination';
import {
  admissionStatusSchema,
  examStatusSchema,
  genderSchema,
  staffRoleSchema,
} from './admission.enums';

const namedRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const admissionListItemSchema = z.object({
  id: z.number().int(),
  patient: namedRefSchema.extend({ document: z.string() }),
  department: namedRefSchema,
  attendingStaff: namedRefSchema.nullable(),
  bedNumber: z.number().int(),
  admissionDate: isoDateTimeSchema,
  dischargeDate: isoDateTimeSchema.nullable(),
  status: admissionStatusSchema,
  diagnosis: z.string().nullable(),
  /** Dias de internação até a alta ou até a data de referência. */
  lengthOfStayDays: z.number(),
});
export type AdmissionListItem = z.infer<typeof admissionListItemSchema>;

export const admissionListSchema = paginatedSchema(admissionListItemSchema);
export type AdmissionList = z.infer<typeof admissionListSchema>;

export const examSchema = z.object({
  id: z.number().int(),
  examType: z.string(),
  requestedAt: isoDateTimeSchema,
  resultAt: isoDateTimeSchema.nullable(),
  status: examStatusSchema,
  resultValue: z.string().nullable(),
  turnaroundHours: z.number().nullable(),
});
export type Exam = z.infer<typeof examSchema>;

export const vitalSignSchema = z.object({
  id: z.number().int(),
  measuredAt: isoDateTimeSchema,
  heartRate: z.number().int().nullable(),
  systolicPressure: z.number().int().nullable(),
  diastolicPressure: z.number().int().nullable(),
  temperature: z.number().nullable(),
  oxygenSaturation: z.number().int().nullable(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

export const admissionDetailSchema = admissionListItemSchema.extend({
  patient: namedRefSchema.extend({
    document: z.string(),
    birthDate: isoDateSchema,
    age: z.number().int(),
    gender: genderSchema,
  }),
  attendingStaff: namedRefSchema.extend({ role: staffRoleSchema }).nullable(),
  exams: z.array(examSchema),
  vitalSigns: z.array(vitalSignSchema),
});
export type AdmissionDetail = z.infer<typeof admissionDetailSchema>;
