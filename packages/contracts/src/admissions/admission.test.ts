import { describe, expect, it } from 'vitest';
import { listAdmissionsQuerySchema } from './admission.query';

describe('listAdmissionsQuerySchema', () => {
  it('aplica paginação e ordenação padrão', () => {
    expect(listAdmissionsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'admissionDate',
      order: 'desc',
    });
  });

  it('converte números vindos da query string', () => {
    const query = listAdmissionsQuerySchema.parse({ page: '2', pageSize: '50', departmentId: '3' });
    expect(query).toMatchObject({ page: 2, pageSize: 50, departmentId: 3 });
  });

  it('rejeita pageSize acima do limite', () => {
    expect(listAdmissionsQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });

  it('rejeita status e ordenação fora da lista permitida', () => {
    expect(listAdmissionsQuerySchema.safeParse({ status: 'transferido' }).success).toBe(false);
    expect(listAdmissionsQuerySchema.safeParse({ sort: 'id; drop table' }).success).toBe(false);
  });

  it('remove espaços da busca e rejeita busca vazia', () => {
    expect(listAdmissionsQuerySchema.parse({ search: '  sepse ' }).search).toBe('sepse');
    expect(listAdmissionsQuerySchema.safeParse({ search: '   ' }).success).toBe(false);
  });

  it('rejeita período invertido', () => {
    const result = listAdmissionsQuerySchema.safeParse({ from: '2026-05-10', to: '2026-05-01' });
    expect(result.success).toBe(false);
  });
});
