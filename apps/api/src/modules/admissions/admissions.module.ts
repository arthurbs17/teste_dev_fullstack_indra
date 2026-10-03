import { Module } from '@nestjs/common';
import { Clock } from '../../shared/application/ports/clock';
import { AdmissionRepository } from './application/ports/admission-repository';
import { GetAdmissionDetailUseCase } from './application/use-cases/get-admission-detail.use-case';
import { ListAdmissionsUseCase } from './application/use-cases/list-admissions.use-case';
import { AdmissionsController } from './infrastructure/http/admissions.controller';
import { PrismaAdmissionRepository } from './infrastructure/persistence/prisma-admission.repository';

@Module({
  controllers: [AdmissionsController],
  providers: [
    { provide: AdmissionRepository, useClass: PrismaAdmissionRepository },
    {
      provide: ListAdmissionsUseCase,
      useFactory: (repository: AdmissionRepository, clock: Clock) =>
        new ListAdmissionsUseCase(repository, clock),
      inject: [AdmissionRepository, Clock],
    },
    {
      provide: GetAdmissionDetailUseCase,
      useFactory: (repository: AdmissionRepository, clock: Clock) =>
        new GetAdmissionDetailUseCase(repository, clock),
      inject: [AdmissionRepository, Clock],
    },
  ],
})
export class AdmissionsModule {}
