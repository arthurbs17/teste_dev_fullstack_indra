import {
  admissionDetailSchema,
  admissionListSchema,
  dailyCensusQuerySchema,
  dailyCensusSchema,
  departmentOccupancySchema,
  departmentSchema,
  idParamSchema,
  kpisQuerySchema,
  kpisSchema,
  listAdmissionsQuerySchema,
} from '@hospital/contracts';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ApiError, apiGet } from './client.server';

/*
 * Server functions: rodam só no servidor do web. No navegador, o build troca
 * a implementação por uma chamada RPC, então o browser nunca fala direto com a
 * API (sem CORS e sem expor API_URL). A entrada é validada com os mesmos
 * schemas que a API usa.
 */

export const getKpis = createServerFn({ method: 'GET' })
  .validator(kpisQuerySchema)
  .handler(({ data }) => apiGet('/api/v1/kpis', kpisSchema, data));

export const getDepartments = createServerFn({ method: 'GET' }).handler(() =>
  apiGet('/api/v1/departments', z.array(departmentSchema)),
);

export const getDepartmentOccupancy = createServerFn({ method: 'GET' }).handler(() =>
  apiGet('/api/v1/departments/occupancy', z.array(departmentOccupancySchema)),
);

export const getDailyCensus = createServerFn({ method: 'GET' })
  .validator(dailyCensusQuerySchema)
  .handler(({ data }) => apiGet('/api/v1/occupancy/daily', dailyCensusSchema, data));

export const listAdmissions = createServerFn({ method: 'GET' })
  .validator(listAdmissionsQuerySchema)
  .handler(({ data }) => apiGet('/api/v1/admissions', admissionListSchema, data));

export const getAdmission = createServerFn({ method: 'GET' })
  .validator(idParamSchema)
  .handler(async ({ data }) => {
    try {
      return await apiGet(`/api/v1/admissions/${data.id}`, admissionDetailSchema);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  });
