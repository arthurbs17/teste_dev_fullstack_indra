import { Admission, NamedRef } from './admission';
import { Exam } from './exam';
import { PatientDetails } from './patient';
import { VitalSign } from './vital-sign';

export type StaffRole = 'médico' | 'enfermeiro';

/** Internação com paciente, responsável, exames e sinais vitais (em ordem cronológica). */
export interface AdmissionDetail {
  admission: Admission;
  patient: PatientDetails;
  attendingStaff: (NamedRef & { role: StaffRole }) | null;
  exams: Exam[];
  vitalSigns: VitalSign[];
}
