import { OccupancyRate } from '../../../shared/domain/occupancy-rate';
import { Period } from '../../../shared/domain/period';

export interface DailyCensusPoint {
  date: string;
  occupiedBeds: number;
  occupancyRate: OccupancyRate;
  admissions: number;
  discharges: number;
}

/** Série diária de leitos ocupados (censo no fim de cada dia). */
export interface DailyCensus {
  period: Period;
  departmentId: number | null;
  totalBeds: number;
  points: DailyCensusPoint[];
}
