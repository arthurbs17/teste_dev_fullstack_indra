import { dailyCensusSchema, kpisSchema, problemDetailsSchema } from '@hospital/contracts';
import request from 'supertest';
import { createTestApp, TestApp } from '../support/create-app';
import { CensusFixture, createCensusFixture, utcDay } from '../support/fixtures';

describe('Indicadores', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.app.close());

  describe('GET /api/v1/kpis (seed)', () => {
    it('usa os últimos 30 dias por padrão e respeita o contrato', async () => {
      const response = await http().get('/api/v1/kpis').expect(200);
      const kpis = kpisSchema.parse(response.body);

      expect(kpis.period).toEqual({ from: utcDay(-29), to: utcDay(0) });
    });

    it('é coerente com os dados do banco', async () => {
      const response = await http().get('/api/v1/kpis').expect(200);
      const kpis = kpisSchema.parse(response.body);

      const [active, pending, beds] = await Promise.all([
        ctx.prisma.admission.count({ where: { status: 'internado' } }),
        ctx.prisma.exam.count({ where: { status: { not: 'concluido' } } }),
        ctx.prisma.department.aggregate({ _sum: { totalBeds: true } }),
      ]);

      expect(kpis.activeAdmissions).toBe(active);
      expect(kpis.pendingExams).toBe(pending);
      expect(kpis.occupancy.totalBeds).toBe(beds._sum.totalBeds);
      expect(kpis.occupancy.occupiedBeds).toBeLessThanOrEqual(kpis.activeAdmissions);
      expect(kpis.mortalityRate ?? 0).toBeGreaterThanOrEqual(0);
      expect(kpis.mortalityRate ?? 0).toBeLessThanOrEqual(1);
    });

    it('rejeita período maior que 366 dias com 422', async () => {
      const response = await http().get('/api/v1/kpis?from=2020-01-01&to=2026-01-01').expect(422);
      expect(problemDetailsSchema.parse(response.body).title).toBe('Regra de negócio violada');
    });

    it('rejeita período invertido e data inválida com 400', async () => {
      const inverted = await http().get('/api/v1/kpis?from=2026-05-10&to=2026-05-01').expect(400);
      expect(problemDetailsSchema.parse(inverted.body).errors?.[0]?.path).toBe('from');

      await http().get('/api/v1/kpis?from=01-05-2026').expect(400);
    });
  });

  describe('GET /api/v1/occupancy/daily (seed)', () => {
    it('gera um ponto por dia e o último bate com a ocupação atual', async () => {
      const [censusResponse, kpisResponse] = await Promise.all([
        http()
          .get(`/api/v1/occupancy/daily?from=${utcDay(-9)}`)
          .expect(200),
        http().get('/api/v1/kpis').expect(200),
      ]);
      const census = dailyCensusSchema.parse(censusResponse.body);
      const kpis = kpisSchema.parse(kpisResponse.body);

      expect(census.points).toHaveLength(10);
      expect(census.points.at(-1)?.occupiedBeds).toBe(kpis.occupancy.occupiedBeds);
    });

    it('não gera dias futuros', async () => {
      const response = await http()
        .get(`/api/v1/occupancy/daily?from=${utcDay(-2)}&to=${utcDay(5)}`)
        .expect(200);
      const census = dailyCensusSchema.parse(response.body);

      expect(census.period.to).toBe(utcDay(0));
      expect(census.points.map((p) => p.date)).toEqual([utcDay(-2), utcDay(-1), utcDay(0)]);
    });

    it('responde 404 para departamento inexistente', async () => {
      await http().get('/api/v1/occupancy/daily?departmentId=9999').expect(404);
    });

    it('responde 400 (e não 500) para departamento acima do maior INTEGER do Postgres', async () => {
      await http().get('/api/v1/occupancy/daily?departmentId=9007199254740991').expect(400);
    });
  });

  describe('censo com fixtures controladas', () => {
    let fixture: CensusFixture;

    beforeAll(async () => {
      fixture = await createCensusFixture(ctx.prisma);
    });

    afterAll(() => fixture.cleanup());

    it('conta leitos distintos, encerra altas futuras na data de referência e registra o movimento', async () => {
      const response = await http()
        .get(`/api/v1/occupancy/daily?departmentId=${fixture.departmentId}&from=${utcDay(-4)}`)
        .expect(200);
      const census = dailyCensusSchema.parse(response.body);

      expect(census.totalBeds).toBe(2);
      expect(census.points.map((p) => [p.occupiedBeds, p.admissions, p.discharges])).toEqual([
        [0, 0, 0], // D-4
        [2, 2, 0], // D-3: A e B internados
        [2, 0, 0], // D-2
        [1, 1, 1], // D-1: C entra no leito de A (conta 1 leito); B recebe alta
        [1, 0, 1], // D:   alta futura de C conta como saída agora; resta A
      ]);
      expect(census.points.map((p) => p.occupancyRate)).toEqual([0, 1, 1, 0.5, 0.5]);
    });
  });
});
