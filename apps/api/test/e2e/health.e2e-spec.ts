import { healthSchema } from '@hospital/contracts';
import request from 'supertest';
import { createTestApp, TestApp } from '../support/create-app';

describe('GET /health', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.app.close());

  it('responde 200 com o banco disponível, fora do prefixo /api/v1', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/health').expect(200);
    expect(healthSchema.parse(response.body)).toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 404 em problem+json para rota inexistente', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/api/v1/nada').expect(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ status: 404, instance: '/api/v1/nada' });
  });
});
