import { Clock } from '../../../../shared/application/ports/clock';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { OccupancyRate } from '../../../../shared/domain/occupancy-rate';
import { Period } from '../../../../shared/domain/period';
import { DailyCensus } from '../../domain/daily-census';
import { IndicatorsQuery } from '../ports/indicators-query';

export interface GetDailyCensusInput {
  from?: string;
  to?: string;
  departmentId?: number;
}

export class GetDailyCensusUseCase {
  constructor(
    private readonly indicators: IndicatorsQuery,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetDailyCensusInput): Promise<DailyCensus> {
    const referenceDate = this.clock.now();
    // Censo de dias futuros não faz sentido: a série para no dia de referência.
    const period = Period.resolve(input, referenceDate).clampTo(referenceDate);
    const departmentId = input.departmentId ?? null;

    const totalBeds = await this.indicators.getTotalBeds(departmentId);
    if (totalBeds === null) {
      throw new NotFoundError(`Departamento ${departmentId} não encontrado.`);
    }

    const days = await this.indicators.getDailyCensus(period, referenceDate, departmentId);

    return {
      period,
      departmentId,
      totalBeds,
      points: days.map((day) => ({
        ...day,
        occupancyRate: OccupancyRate.of(day.occupiedBeds, totalBeds),
      })),
    };
  }
}
