import request from 'supertest';
import { createTestApp, TestApp } from '../support/create-app';

interface OpenApiResponse {
  content?: Record<string, { schema: { $ref?: string } }>;
}
interface OpenApiDocument {
  paths: Record<string, Record<string, { responses: Record<string, OpenApiResponse> }>>;
  components: { schemas: Record<string, unknown> };
}

describe('Documentação OpenAPI (/docs-json)', () => {
  let ctx: TestApp;
  let doc: OpenApiDocument;

  beforeAll(async () => {
    ctx = await createTestApp();
    doc = (await request(ctx.app.getHttpServer()).get('/docs-json').expect(200)).body;
  });

  afterAll(() => ctx.app.close());

  const responsesOf = (path: string) => doc.paths[path]?.get?.responses ?? {};

  it('documenta todas as rotas da API', () => {
    expect(Object.keys(doc.paths).sort()).toEqual([
      '/api/v1/admissions',
      '/api/v1/admissions/{id}',
      '/api/v1/departments',
      '/api/v1/departments/occupancy',
      '/api/v1/kpis',
      '/api/v1/occupancy/daily',
      '/health',
    ]);
  });

  it.each([
    ['/api/v1/kpis', ['200', '400', '422', '500']],
    ['/api/v1/occupancy/daily', ['200', '400', '404', '422', '500']],
    ['/api/v1/admissions', ['200', '400', '500']],
    ['/api/v1/admissions/{id}', ['200', '400', '404', '500']],
    ['/health', ['200', '503']],
  ])('documenta as respostas de %s', (path, statuses) => {
    expect(Object.keys(responsesOf(path)).sort()).toEqual(statuses);
  });

  it('descreve os erros como application/problem+json com o schema do contrato', () => {
    const error = responsesOf('/api/v1/occupancy/daily')['404'];
    expect(error?.content?.['application/problem+json']?.schema.$ref).toBe(
      '#/components/schemas/ProblemDetailsDto_Output',
    );
  });

  it('não tem referências quebradas', () => {
    const refs = Object.values(doc.paths)
      .flatMap((operations) => Object.values(operations))
      .flatMap((operation) => Object.values(operation.responses))
      .flatMap((response) => Object.values(response.content ?? {}))
      .map((media) => media.schema.$ref)
      .filter((ref): ref is string => Boolean(ref));

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(doc.components.schemas).toHaveProperty(ref.replace('#/components/schemas/', ''));
    }
  });
});
