import { describe, expect, it } from 'vitest';
import { dailyCensusQuerySchema } from './daily-census';

describe('dailyCensusQuerySchema', () => {
  it('converte o departamento vindo da query string', () => {
    expect(dailyCensusQuerySchema.parse({ departmentId: '2' })).toEqual({ departmentId: 2 });
  });

  it('rejeita período invertido', () => {
    const result = dailyCensusQuerySchema.safeParse({ from: '2026-06-02', to: '2026-06-01' });
    expect(result.success).toBe(false);
  });
});
