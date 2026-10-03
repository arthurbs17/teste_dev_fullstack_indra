import {
  admissionDetailSchema,
  admissionListSchema,
  problemDetailsSchema,
} from '@hospital/contracts';
import request from 'supertest';
import { createTestApp, TestApp } from '../support/create-app';
import { CensusFixture, createCensusFixture } from '../support/fixtures';

describe('Internações', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());
  const list = async (query: string) => {
    const response = await http().get(`/api/v1/admissions?${query}`).expect(200);
    return admissionListSchema.parse(response.body);
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.app.close());

  describe('GET /api/v1/admissions (seed)', () => {
    it('pagina sem repetir nem perder internações', async () => {
      const first = await list('pageSize=15&page=1');
      const pages = await Promise.all(
        Array.from({ length: first.totalPages }, (_, i) => list(`pageSize=15&page=${i + 1}`)),
      );
      const ids = pages.flatMap((page) => page.data.map((item) => item.id));

      expect(first.total).toBe(await ctx.prisma.admission.count());
      expect(ids).toHaveLength(first.total);
      expect(new Set(ids).size).toBe(first.total);
    });

    it('ordena pela data de internação mais recente por padrão', async () => {
      const page = await list('pageSize=100');
      const dates = page.data.map((item) => item.admissionDate);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it('filtra por status e departamento', async () => {
      const active = await list('status=internado&pageSize=100');
      expect(active.total).toBe(
        await ctx.prisma.admission.count({ where: { status: 'internado' } }),
      );
      expect(active.data.every((item) => item.status === 'internado')).toBe(true);

      const byDepartment = await list('departmentId=3&pageSize=100');
      expect(byDepartment.data.every((item) => item.department.id === 3)).toBe(true);
    });

    it('filtra pelo período da data de internação (inclusive)', async () => {
      const all = await list('pageSize=100&sort=admissionDate&order=asc');
      const day = all.data[Math.floor(all.data.length / 2)]?.admissionDate.slice(0, 10) ?? '';

      const sameDay = await list(`from=${day}&to=${day}&pageSize=100`);
      expect(sameDay.total).toBeGreaterThan(0);
      expect(sameDay.data.every((item) => item.admissionDate.startsWith(day))).toBe(true);
    });

    it('mantém o total quando a página pedida passa do fim', async () => {
      const page = await list('page=999');
      expect(page.data).toEqual([]);
      expect(page.total).toBeGreaterThan(0);
    });

    it('valida parâmetros com 400 e lista os campos inválidos', async () => {
      const response = await http()
        .get('/api/v1/admissions?status=transferido&sort=id&pageSize=500')
        .expect(400);
      const paths = problemDetailsSchema.parse(response.body).errors?.map((e) => e.path);
      expect(paths).toEqual(expect.arrayContaining(['status', 'sort', 'pageSize']));
    });
  });

  describe('com fixtures controladas', () => {
    let fixture: CensusFixture;

    beforeAll(async () => {
      fixture = await createCensusFixture(ctx.prisma);
    });

    afterAll(() => fixture.cleanup());

    it('ordena pelo tempo de internação, com a alta futura limitada a agora', async () => {
      const page = await list(`departmentId=${fixture.departmentId}&sort=lengthOfStay&order=desc`);
      const { a, b, c } = fixture.admissionIds;

      expect(page.data.map((item) => item.id)).toEqual([a, b, c]);
      expect(page.data.find((item) => item.id === b)?.lengthOfStayDays).toBe(2);
    });

    it('busca sem diferenciar maiúsculas e trata % e _ como texto', async () => {
      const { a, c } = fixture.admissionIds;

      expect((await list('search=FIXTURE')).total).toBe(3);
      expect((await list(`search=${encodeURIComponent('100%')}`)).data.map((i) => i.id)).toEqual([
        a,
      ]);
      expect((await list(`search=${encodeURIComponent('%')}`)).data.map((i) => i.id)).toEqual([a]);
      expect((await list('search=_')).data.map((i) => i.id)).toEqual([c]);
    });

    it('detalha a internação com exames e sinais vitais em ordem cronológica', async () => {
      const response = await http().get(`/api/v1/admissions/${fixture.admissionIds.a}`).expect(200);
      const detail = admissionDetailSchema.parse(response.body);

      expect(detail.status).toBe('internado');
      expect(detail.dischargeDate).toBeNull();
      expect(detail.patient).toMatchObject({ birthDate: '1980-01-15', gender: 'F' });
      expect(detail.exams.map((e) => [e.examType, e.turnaroundHours])).toEqual([
        ['Hemograma completo', 6],
        ['Glicemia', null],
      ]);
      expect(detail.vitalSigns.map((v) => v.temperature)).toEqual([38.1, 36.5]);
    });
  });

  describe('GET /api/v1/admissions/:id', () => {
    it('responde 404 para internação inexistente', async () => {
      const response = await http().get('/api/v1/admissions/999999').expect(404);
      expect(problemDetailsSchema.parse(response.body).detail).toBe(
        'Internação 999999 não encontrada.',
      );
    });

    it('responde 400 para id inválido', async () => {
      await http().get('/api/v1/admissions/abc').expect(400);
    });

    it('responde 400 (e não 500) para id acima do maior INTEGER do Postgres', async () => {
      await http().get('/api/v1/admissions/2147483648').expect(400);
      await http().get('/api/v1/admissions/9007199254740991').expect(400);
    });
  });
});
