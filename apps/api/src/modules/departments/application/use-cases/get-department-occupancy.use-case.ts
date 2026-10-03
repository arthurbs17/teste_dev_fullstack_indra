import { DepartmentOccupancy } from '../../domain/department-occupancy';
import { DepartmentRepository } from '../ports/department-repository';

export class GetDepartmentOccupancyUseCase {
  constructor(private readonly departments: DepartmentRepository) {}

  async execute(): Promise<DepartmentOccupancy[]> {
    const rows = await this.departments.findCurrentOccupancy();
    return rows
      .map((row) => new DepartmentOccupancy(row.department, row.occupiedBeds))
      .sort(
        (a, b) => b.rate.value - a.rate.value || a.department.name.localeCompare(b.department.name),
      );
  }
}
