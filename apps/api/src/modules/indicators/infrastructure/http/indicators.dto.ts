import {
  dailyCensusQuerySchema,
  dailyCensusSchema,
  kpisQuerySchema,
  kpisSchema,
} from '@hospital/contracts';
import { createZodDto } from 'nestjs-zod';

export class KpisQueryDto extends createZodDto(kpisQuerySchema) {}

export class KpisDto extends createZodDto(kpisSchema) {}

export class DailyCensusQueryDto extends createZodDto(dailyCensusQuerySchema) {}

export class DailyCensusDto extends createZodDto(dailyCensusSchema) {}
