import { departmentOccupancySchema, departmentSchema, kpisSchema } from '@hospital/contracts';
import request from 'supertest';
import { z } from 'zod';
import { createTestApp, TestApp } from '../support/create-app';

describe('Departamentos', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.app.close());

  it('lista os departamentos do seed ordenados por nome', async () => {
    const response = await http().get('/api/v1/departments').expect(200);
    const departments = z.array(departmentSchema).parse(response.body);

    expect(departments.map((d) => d.name)).toEqual([
      'Cirurgia',
      'Clínica Médica',
      'Pediatria',
      'Pronto Socorro',
      'UTI',
    ]);
  });

  it('retorna a ocupação de todos os departamentos, da maior para a menor taxa', async () => {
    const response = await http().get('/api/v1/departments/occupancy').expect(200);
    const occupancy = z.array(departmentOccupancySchema).parse(response.body);

    expect(occupancy).toHaveLength(5);
    const rates = occupancy.map((o) => o.occupancyRate);
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
    for (const o of occupancy) {
      expect(o.occupancyRate).toBeCloseTo(o.occupiedBeds / o.totalBeds, 4);
    }
  });

  it('é coerente com a ocupação geral dos KPIs', async () => {
    const [byDepartment, kpis] = await Promise.all([
      http().get('/api/v1/departments/occupancy').expect(200),
      http().get('/api/v1/kpis').expect(200),
    ]);
    const occupancy = z.array(departmentOccupancySchema).parse(byDepartment.body);
    const report = kpisSchema.parse(kpis.body);

    const sum = (key: 'occupiedBeds' | 'totalBeds') =>
      occupancy.reduce((total, o) => total + o[key], 0);
    expect(sum('occupiedBeds')).toBe(report.occupancy.occupiedBeds);
    expect(sum('totalBeds')).toBe(report.occupancy.totalBeds);
  });
});
