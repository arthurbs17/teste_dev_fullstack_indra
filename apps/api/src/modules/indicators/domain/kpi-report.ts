import { OccupancyRate } from '../../../shared/domain/occupancy-rate';
import { Period } from '../../../shared/domain/period';

/** Indicadores gerais do dashboard para um período. */
export interface KpiReport {
  period: Period;
  referenceDate: Date;
  occupancy: { occupiedBeds: number; totalBeds: number; rate: OccupancyRate };
  activeAdmissions: number;
  admissionsInPeriod: number;
  dischargesInPeriod: number;
  averageLengthOfStayDays: number | null;
  mortalityRate: number | null;
  pendingExams: number;
  averageExamTurnaroundHours: number | null;
}
