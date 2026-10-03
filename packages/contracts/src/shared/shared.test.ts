import { describe, expect, it } from 'vitest';
import { idParamSchema } from './params';
import { periodQuerySchema } from './period';

describe('periodQuerySchema', () => {
  it('aceita período válido', () => {
    expect(periodQuerySchema.parse({ from: '2026-05-01', to: '2026-05-31' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('rejeita data em formato inválido', () => {
    expect(periodQuerySchema.safeParse({ from: '01/05/2026' }).success).toBe(false);
  });

  it('rejeita período invertido apontando o campo "from"', () => {
    const result = periodQuerySchema.safeParse({ from: '2026-05-10', to: '2026-05-01' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['from']);
  });
});

describe('idParamSchema', () => {
  it('aceita apenas inteiros positivos', () => {
    expect(idParamSchema.parse({ id: '7' })).toEqual({ id: 7 });
    expect(idParamSchema.safeParse({ id: '0' }).success).toBe(false);
    expect(idParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});

describe('limites de int4', () => {
  it('rejeita ids acima do maior INTEGER do Postgres', () => {
    expect(idParamSchema.parse({ id: '2147483647' })).toEqual({ id: 2_147_483_647 });
    expect(idParamSchema.safeParse({ id: '2147483648' }).success).toBe(false);
  });
});
