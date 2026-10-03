import { problemDetailsSchema } from '@hospital/contracts';
import { createZodDto } from 'nestjs-zod';

export class ProblemDetailsDto extends createZodDto(problemDetailsSchema) {}
