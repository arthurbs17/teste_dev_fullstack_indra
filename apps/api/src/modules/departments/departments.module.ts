import { Module } from '@nestjs/common';
import { DepartmentRepository } from './application/ports/department-repository';
import { GetDepartmentOccupancyUseCase } from './application/use-cases/get-department-occupancy.use-case';
import { ListDepartmentsUseCase } from './application/use-cases/list-departments.use-case';
import { DepartmentsController } from './infrastructure/http/departments.controller';
import { PrismaDepartmentRepository } from './infrastructure/persistence/prisma-department.repository';

@Module({
  controllers: [DepartmentsController],
  providers: [
    { provide: DepartmentRepository, useClass: PrismaDepartmentRepository },
    {
      provide: ListDepartmentsUseCase,
      useFactory: (repository: DepartmentRepository) => new ListDepartmentsUseCase(repository),
      inject: [DepartmentRepository],
    },
    {
      provide: GetDepartmentOccupancyUseCase,
      useFactory: (repository: DepartmentRepository) =>
        new GetDepartmentOccupancyUseCase(repository),
      inject: [DepartmentRepository],
    },
  ],
})
export class DepartmentsModule {}
