import { Clock } from '../../../../shared/application/ports/clock';
import { BusinessRuleViolationError, NotFoundError } from '../../../../shared/domain/domain-error';
import { Period } from '../../../../shared/domain/period';
import { CensusDayFigures, IndicatorsQuery, KpiFigures } from '../ports/indicators-query';
import { GetDailyCensusUseCase } from './get-daily-census.use-case';
import { GetKpisUseCase } from './get-kpis.use-case';

class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return this.instant;
  }
}

const baseFigures: KpiFigures = {
  totalBeds: 100,
  occupiedBeds: 3,
  activeAdmissions: 3,
  pendingExams: 0,
  admissionsInPeriod: 20,
  closedInPeriod: 8,
  deathsInPeriod: 2,
  averageLengthOfStayHours: 130,
  averageExamTurnaroundHours: 6.456,
};

class FakeIndicatorsQuery extends IndicatorsQuery {
  lastPeriod?: Period;
  lastDepartmentId?: number | null;

  constructor(
    private readonly figures: KpiFigures = baseFigures,
    private readonly beds: number | null = 100,
  ) {
    super();
  }

  async getKpiFigures(period: Period): Promise<KpiFigures> {
    this.lastPeriod = period;
    return this.figures;
  }

  async getTotalBeds(departmentId: number | null): Promise<number | null> {
    this.lastDepartmentId = departmentId;
    return this.beds;
  }

  async getDailyCensus(period: Period): Promise<CensusDayFigures[]> {
    this.lastPeriod = period;
    return [
      { date: '2026-10-02', occupiedBeds: 5, admissions: 2, discharges: 1 },
      { date: '2026-10-03', occupiedBeds: 3, admissions: 0, discharges: 2 },
    ];
  }
}

const clock = new FixedClock(new Date('2026-10-03T12:00:00.000Z'));

describe('GetKpisUseCase', () => {
  it('calcula taxas e converte horas em dias', async () => {
    const report = await new GetKpisUseCase(new FakeIndicatorsQuery(), clock).execute({});

    expect(report.occupancy.rate.value).toBe(0.03);
    expect(report.averageLengthOfStayDays).toBe(5.4);
    expect(report.mortalityRate).toBe(0.25);
    expect(report.averageExamTurnaroundHours).toBe(6.5);
    expect(report.dischargesInPeriod).toBe(8);
    expect(report.referenceDate).toBe(clock.now());
  });

  it('usa os últimos 30 dias quando o período não é informado', async () => {
    const query = new FakeIndicatorsQuery();
    await new GetKpisUseCase(query, clock).execute({});
    expect([query.lastPeriod?.from, query.lastPeriod?.to]).toEqual(['2026-09-04', '2026-10-03']);
  });

  it('retorna null nas médias e taxas sem dados no período', async () => {
    const empty: KpiFigures = {
      ...baseFigures,
      closedInPeriod: 0,
      deathsInPeriod: 0,
      averageLengthOfStayHours: null,
      averageExamTurnaroundHours: null,
    };

    const report = await new GetKpisUseCase(new FakeIndicatorsQuery(empty), clock).execute({});

    expect(report.mortalityRate).toBeNull();
    expect(report.averageLengthOfStayDays).toBeNull();
    expect(report.averageExamTurnaroundHours).toBeNull();
  });

  it('propaga a validação do período', async () => {
    await expect(
      new GetKpisUseCase(new FakeIndicatorsQuery(), clock).execute({
        from: '2020-01-01',
        to: '2026-01-01',
      }),
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});

describe('GetDailyCensusUseCase', () => {
  it('calcula a taxa de cada dia sobre os leitos do escopo', async () => {
    const census = await new GetDailyCensusUseCase(new FakeIndicatorsQuery(), clock).execute({});

    expect(census.totalBeds).toBe(100);
    expect(census.departmentId).toBeNull();
    expect(census.points.map((p) => p.occupancyRate.value)).toEqual([0.05, 0.03]);
  });

  it('não gera dias depois da data de referência', async () => {
    const query = new FakeIndicatorsQuery();
    await new GetDailyCensusUseCase(query, clock).execute({ from: '2026-09-28', to: '2026-10-20' });
    expect(query.lastPeriod?.to).toBe('2026-10-03');
  });

  it('filtra pelo departamento informado', async () => {
    const query = new FakeIndicatorsQuery(baseFigures, 15);
    const census = await new GetDailyCensusUseCase(query, clock).execute({ departmentId: 3 });
    expect(query.lastDepartmentId).toBe(3);
    expect(census.departmentId).toBe(3);
  });

  it('lança NotFoundError para departamento inexistente', async () => {
    const query = new FakeIndicatorsQuery(baseFigures, null);
    await expect(
      new GetDailyCensusUseCase(query, clock).execute({ departmentId: 99 }),
    ).rejects.toThrow(NotFoundError);
  });
});
