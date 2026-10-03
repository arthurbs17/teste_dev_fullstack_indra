import { Clock } from '../../../../shared/application/ports/clock';
import { Admission } from '../../domain/admission';
import {
  AdmissionFilters,
  AdmissionRepository,
  AdmissionSortField,
} from '../ports/admission-repository';

export interface ListAdmissionsInput extends AdmissionFilters {
  page: number;
  pageSize: number;
  sort: AdmissionSortField;
  order: 'asc' | 'desc';
}

export interface AdmissionListResult {
  items: Array<{ admission: Admission; lengthOfStayDays: number }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ListAdmissionsUseCase {
  constructor(
    private readonly admissions: AdmissionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListAdmissionsInput): Promise<AdmissionListResult> {
    const referenceDate = this.clock.now();
    const { page, pageSize, sort, order, ...filters } = input;

    const result = await this.admissions.findPage({
      filters,
      sort: { field: sort, order },
      page,
      pageSize,
      referenceDate,
    });

    return {
      items: result.items.map((admission) => ({
        admission,
        lengthOfStayDays: admission.lengthOfStayDays(referenceDate),
      })),
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }
}
