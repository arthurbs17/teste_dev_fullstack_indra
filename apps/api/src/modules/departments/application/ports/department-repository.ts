import { Department } from '../../domain/department';

export interface DepartmentOccupancyRow {
  department: Department;
  occupiedBeds: number;
}

export abstract class DepartmentRepository {
  abstract findAll(): Promise<Department[]>;

  /** Leitos ocupados agora (internações ativas) por departamento. */
  abstract findCurrentOccupancy(): Promise<DepartmentOccupancyRow[]>;
}
