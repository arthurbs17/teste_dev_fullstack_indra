import {
  admissionDetailSchema,
  admissionListSchema,
  idParamSchema,
  listAdmissionsQuerySchema,
} from '@hospital/contracts';
import { createZodDto } from 'nestjs-zod';

export class ListAdmissionsQueryDto extends createZodDto(listAdmissionsQuerySchema) {}

export class AdmissionListDto extends createZodDto(admissionListSchema) {}

export class AdmissionIdParamDto extends createZodDto(idParamSchema) {}

export class AdmissionDetailDto extends createZodDto(admissionDetailSchema) {}
