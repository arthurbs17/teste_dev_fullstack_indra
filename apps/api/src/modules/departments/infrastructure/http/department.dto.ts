import { departmentOccupancySchema, departmentSchema } from '@hospital/contracts';
import { createZodDto } from 'nestjs-zod';

export class DepartmentDto extends createZodDto(departmentSchema) {}

export class DepartmentOccupancyDto extends createZodDto(departmentOccupancySchema) {}
