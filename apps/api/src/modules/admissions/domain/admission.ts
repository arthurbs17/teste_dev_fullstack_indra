import { ACTIVE_ADMISSION_STATUS, AdmissionStatus } from '../../../shared/domain/admission-status';
import { round } from '../../../shared/domain/math';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NamedRef {
  id: number;
  name: string;
}

export interface AdmissionProps {
  id: number;
  patient: NamedRef & { document: string };
  department: NamedRef;
  attendingStaff: NamedRef | null;
  bedNumber: number;
  admissionDate: Date;
  dischargeDate: Date | null;
  status: AdmissionStatus;
  diagnosis: string | null;
}

export class Admission {
  constructor(readonly props: AdmissionProps) {}

  get id(): number {
    return this.props.id;
  }

  get isActive(): boolean {
    return this.props.status === ACTIVE_ADMISSION_STATUS;
  }

  /**
   * Fim da internação para cálculos: a data de referência se ainda ativa;
   * senão, a alta limitada à data de referência (o seed tem altas no futuro).
   */
  effectiveEnd(referenceDate: Date): Date {
    if (this.isActive || !this.props.dischargeDate) return referenceDate;
    return this.props.dischargeDate < referenceDate ? this.props.dischargeDate : referenceDate;
  }

  /** Dias de internação (1 casa decimal), nunca negativo. */
  lengthOfStayDays(referenceDate: Date): number {
    const ms = this.effectiveEnd(referenceDate).getTime() - this.props.admissionDate.getTime();
    return Math.max(0, round(ms / DAY_MS, 1));
  }
}
