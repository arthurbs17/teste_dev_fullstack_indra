import { Clock } from '../../../../shared/application/ports/clock';
import { ratio, round } from '../../../../shared/domain/math';
import { OccupancyRate } from '../../../../shared/domain/occupancy-rate';
import { Period } from '../../../../shared/domain/period';
import { KpiReport } from '../../domain/kpi-report';
import { IndicatorsQuery } from '../ports/indicators-query';

export interface GetKpisInput {
  from?: string;
  to?: string;
}

export class GetKpisUseCase {
  constructor(
    private readonly indicators: IndicatorsQuery,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetKpisInput): Promise<KpiReport> {
    const referenceDate = this.clock.now();
    const period = Period.resolve(input, referenceDate);
    const figures = await this.indicators.getKpiFigures(period, referenceDate);

    return {
      period,
      referenceDate,
      occupancy: {
        occupiedBeds: figures.occupiedBeds,
        totalBeds: figures.totalBeds,
        rate: OccupancyRate.of(figures.occupiedBeds, figures.totalBeds),
      },
      activeAdmissions: figures.activeAdmissions,
      admissionsInPeriod: figures.admissionsInPeriod,
      dischargesInPeriod: figures.closedInPeriod,
      averageLengthOfStayDays:
        figures.averageLengthOfStayHours === null
          ? null
          : round(figures.averageLengthOfStayHours / 24, 1),
      mortalityRate: ratio(figures.deathsInPeriod, figures.closedInPeriod),
      pendingExams: figures.pendingExams,
      averageExamTurnaroundHours:
        figures.averageExamTurnaroundHours === null
          ? null
          : round(figures.averageExamTurnaroundHours, 1),
    };
  }
}
