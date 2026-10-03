import { Department } from '../../domain/department';
import { DepartmentRepository } from '../ports/department-repository';

export class ListDepartmentsUseCase {
  constructor(private readonly departments: DepartmentRepository) {}

  execute(): Promise<Department[]> {
    return this.departments.findAll();
  }
}
