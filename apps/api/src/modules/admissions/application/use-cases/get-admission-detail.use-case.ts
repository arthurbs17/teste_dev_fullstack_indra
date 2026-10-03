import { Clock } from '../../../../shared/application/ports/clock';
import { AdmissionDetail } from '../../domain/admission-detail';
import { AdmissionNotFoundError } from '../../domain/admission-not-found.error';
import { ageInYears } from '../../domain/patient';
import { AdmissionRepository } from '../ports/admission-repository';

export interface AdmissionDetailResult {
  detail: AdmissionDetail;
  lengthOfStayDays: number;
  patientAge: number;
}

export class GetAdmissionDetailUseCase {
  constructor(
    private readonly admissions: AdmissionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: number): Promise<AdmissionDetailResult> {
    const detail = await this.admissions.findDetailById(id);
    if (!detail) throw new AdmissionNotFoundError(id);

    const referenceDate = this.clock.now();
    return {
      detail,
      lengthOfStayDays: detail.admission.lengthOfStayDays(referenceDate),
      patientAge: ageInYears(detail.patient.birthDate, referenceDate),
    };
  }
}
