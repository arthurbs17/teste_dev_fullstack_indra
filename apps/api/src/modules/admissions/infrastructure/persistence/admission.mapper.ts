import type {
  Admission as AdmissionRow,
  Department as DepartmentRow,
  Exam as ExamRow,
  Patient as PatientRow,
  Staff as StaffRow,
  VitalSign as VitalSignRow,
} from '../../../../generated/prisma/client';
import { ADMISSION_STATUSES, AdmissionStatus } from '../../../../shared/domain/admission-status';
import { Admission } from '../../domain/admission';
import { AdmissionDetail, StaffRole } from '../../domain/admission-detail';
import { Exam, ExamStatus } from '../../domain/exam';
import { Gender } from '../../domain/patient';

export interface AdmissionListSqlRow {
  id: number;
  bed_number: number;
  admission_date: Date;
  discharge_date: Date | null;
  status: string;
  diagnosis: string | null;
  patient_id: number;
  patient_name: string;
  patient_document: string;
  department_id: number;
  department_name: string;
  staff_id: number | null;
  staff_name: string | null;
}

type AdmissionDetailRow = AdmissionRow & {
  patient: PatientRow;
  department: DepartmentRow;
  attendingStaff: StaffRow | null;
  exams: ExamRow[];
  vitalSigns: VitalSignRow[];
};

const EXAM_STATUSES = ['solicitado', 'em_andamento', 'concluido'] as const;
const GENDERS = ['M', 'F'] as const;
const STAFF_ROLES = ['médico', 'enfermeiro'] as const;

/**
 * Converte linhas do banco em objetos de domínio. Os textos com valores
 * restritos (status, gênero, cargo) são checados: o banco tem CHECK
 * constraints, então um valor fora da lista indica dado corrompido.
 */
export const AdmissionMapper = {
  fromListRow(row: AdmissionListSqlRow): Admission {
    return new Admission({
      id: row.id,
      patient: { id: row.patient_id, name: row.patient_name, document: row.patient_document },
      department: { id: row.department_id, name: row.department_name },
      attendingStaff:
        row.staff_id === null ? null : { id: row.staff_id, name: row.staff_name ?? '' },
      bedNumber: row.bed_number,
      admissionDate: row.admission_date,
      dischargeDate: row.discharge_date,
      status: oneOf<AdmissionStatus>(ADMISSION_STATUSES, row.status, 'status da internação'),
      diagnosis: row.diagnosis,
    });
  },

  fromDetailRow(row: AdmissionDetailRow): AdmissionDetail {
    const staff = row.attendingStaff;

    return {
      admission: new Admission({
        id: row.id,
        patient: { id: row.patient.id, name: row.patient.name, document: row.patient.document },
        department: { id: row.department.id, name: row.department.name },
        attendingStaff: staff ? { id: staff.id, name: staff.name } : null,
        bedNumber: row.bedNumber,
        admissionDate: row.admissionDate,
        dischargeDate: row.dischargeDate,
        status: oneOf<AdmissionStatus>(ADMISSION_STATUSES, row.status, 'status da internação'),
        diagnosis: row.diagnosis,
      }),
      patient: {
        id: row.patient.id,
        name: row.patient.name,
        document: row.patient.document,
        birthDate: row.patient.birthDate,
        gender: oneOf<Gender>(GENDERS, row.patient.gender, 'gênero'),
      },
      attendingStaff: staff
        ? {
            id: staff.id,
            name: staff.name,
            role: oneOf<StaffRole>(STAFF_ROLES, staff.role, 'cargo'),
          }
        : null,
      exams: row.exams.map(
        (exam) =>
          new Exam({
            id: exam.id,
            examType: exam.examType,
            requestedAt: exam.requestedAt,
            resultAt: exam.resultAt,
            status: oneOf<ExamStatus>(EXAM_STATUSES, exam.status, 'status do exame'),
            resultValue: exam.resultValue,
          }),
      ),
      vitalSigns: row.vitalSigns.map((vital) => ({
        id: vital.id,
        measuredAt: vital.measuredAt,
        heartRate: vital.heartRate,
        systolicPressure: vital.systolicPressure,
        diastolicPressure: vital.diastolicPressure,
        temperature: vital.temperature === null ? null : vital.temperature.toNumber(),
        oxygenSaturation: vital.oxygenSaturation,
      })),
    };
  },
};

function oneOf<T extends string>(allowed: readonly string[], value: string, field: string): T {
  if (!allowed.includes(value)) {
    throw new Error(`Valor inesperado para ${field}: "${value}"`);
  }
  return value as T;
}
