import { z } from 'zod';

export const admissionStatusSchema = z.enum(['internado', 'alta', 'obito']);
export type AdmissionStatus = z.infer<typeof admissionStatusSchema>;

export const examStatusSchema = z.enum(['solicitado', 'em_andamento', 'concluido']);
export type ExamStatus = z.infer<typeof examStatusSchema>;

export const genderSchema = z.enum(['M', 'F']);
export type Gender = z.infer<typeof genderSchema>;

export const staffRoleSchema = z.enum(['médico', 'enfermeiro']);
export type StaffRole = z.infer<typeof staffRoleSchema>;
