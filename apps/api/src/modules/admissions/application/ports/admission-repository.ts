import { AdmissionStatus } from '../../../../shared/domain/admission-status';
import { Admission } from '../../domain/admission';
import { AdmissionDetail } from '../../domain/admission-detail';

export const ADMISSION_SORT_FIELDS = [
  'admissionDate',
  'dischargeDate',
  'patientName',
  'departmentName',
  'lengthOfStay',
] as const;
export type AdmissionSortField = (typeof ADMISSION_SORT_FIELDS)[number];

export interface AdmissionFilters {
  status?: AdmissionStatus;
  departmentId?: number;
  /** Data de internação inicial (YYYY-MM-DD, inclusive). */
  from?: string;
  /** Data de internação final (YYYY-MM-DD, inclusive). */
  to?: string;
  /** Nome ou documento do paciente, ou diagnóstico (parcial, sem diferenciar maiúsculas). */
  search?: string;
}

export interface AdmissionPageRequest {
  filters: AdmissionFilters;
  sort: { field: AdmissionSortField; order: 'asc' | 'desc' };
  page: number;
  pageSize: number;
  /** Usada para ordenar por tempo de internação das ativas. */
  referenceDate: Date;
}

export interface AdmissionPage {
  items: Admission[];
  total: number;
}

export abstract class AdmissionRepository {
  abstract findPage(request: AdmissionPageRequest): Promise<AdmissionPage>;

  abstract findDetailById(id: number): Promise<AdmissionDetail | null>;
}
