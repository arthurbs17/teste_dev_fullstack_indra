// @vitest-environment node
import { departmentSchema } from '@hospital/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiGet } from './client.server';

const departments = z.array(departmentSchema);
const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test:3001/');
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('apiGet', () => {
  it('monta a URL a partir de API_URL e ignora parâmetros vazios', async () => {
    fetchMock.mockResolvedValue(json([]));

    await apiGet('/api/v1/departments', departments, { page: 2, status: undefined, search: '' });

    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.toString()).toBe('http://api.test:3001/api/v1/departments?page=2');
  });

  it('retorna os dados validados pelo contrato', async () => {
    fetchMock.mockResolvedValue(json([{ id: 1, name: 'UTI', totalBeds: 15 }]));

    await expect(apiGet('/api/v1/departments', departments)).resolves.toEqual([
      { id: 1, name: 'UTI', totalBeds: 15 },
    ]);
  });

  it('lança ApiError com o problem+json em respostas de erro', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          type: 'about:blank',
          title: 'Recurso não encontrado',
          status: 404,
          detail: 'Internação 9 não encontrada.',
        },
        404,
      ),
    );

    const error = await apiGet('/api/v1/admissions/9', departments).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'Internação 9 não encontrada.' });
  });

  it('rejeita resposta fora do contrato', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(json([{ id: '1', nome: 'UTI' }]));

    await expect(apiGet('/api/v1/departments', departments)).rejects.toThrow(
      'A API respondeu em um formato inesperado.',
    );
  });

  it('traduz falha de conexão em mensagem amigável', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiGet('/api/v1/departments', departments)).rejects.toThrow(
      'Não foi possível conectar à API.',
    );
  });

  it('exige API_URL válida', async () => {
    vi.stubEnv('API_URL', 'não é url');

    await expect(apiGet('/api/v1/departments', departments)).rejects.toThrow('API_URL');
  });
});
