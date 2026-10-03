import { z } from 'zod';
import { rateSchema } from '../shared/params';

export const departmentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  totalBeds: z.number().int(),
});
export type Department = z.infer<typeof departmentSchema>;

export const departmentOccupancySchema = z.object({
  departmentId: z.number().int(),
  departmentName: z.string(),
  totalBeds: z.number().int(),
  occupiedBeds: z.number().int(),
  occupancyRate: rateSchema,
});
export type DepartmentOccupancy = z.infer<typeof departmentOccupancySchema>;
