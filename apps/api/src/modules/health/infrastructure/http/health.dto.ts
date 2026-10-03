import { healthSchema } from '@hospital/contracts';
import { createZodDto } from 'nestjs-zod';

export class HealthDto extends createZodDto(healthSchema) {}
