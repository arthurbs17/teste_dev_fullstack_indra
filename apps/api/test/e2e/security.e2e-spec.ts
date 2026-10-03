import { problemDetailsSchema } from '@hospital/contracts';
import request from 'supertest';
import { createTestApp, TestApp } from '../support/create-app';

/** Cria a aplicação com variáveis de ambiente temporárias e as restaura depois. */
async function withEnv(vars: Record<string, string>, run: (ctx: TestApp) => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.assign(process.env, vars);
  const ctx = await createTestApp();
  try {
    await run(ctx);
  } finally {
    await ctx.app.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('Segurança HTTP', () => {
  it('envia cabeçalhos de segurança e não expõe o framework', async () => {
    await withEnv({}, async (ctx) => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/departments')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  it('limita requisições por minuto com 429 em problem+json, sem limitar o /health', async () => {
    await withEnv({ RATE_LIMIT_PER_MINUTE: '3' }, async (ctx) => {
      const http = () => request(ctx.app.getHttpServer());
      for (let i = 0; i < 3; i++) await http().get('/api/v1/departments').expect(200);

      const blocked = await http().get('/api/v1/departments').expect(429);
      expect(blocked.headers['content-type']).toContain('application/problem+json');
      expect(blocked.headers['retry-after']).toBeDefined();
      expect(problemDetailsSchema.parse(blocked.body).title).toBe('Muitas requisições');

      for (let i = 0; i < 5; i++) await http().get('/health').expect(200);
    });
  });

  it('desliga o Swagger com SWAGGER_ENABLED=false', async () => {
    await withEnv({ SWAGGER_ENABLED: 'false' }, async (ctx) => {
      await request(ctx.app.getHttpServer()).get('/docs-json').expect(404);
    });
  });
});
