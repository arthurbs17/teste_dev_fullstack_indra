import type {
  Department,
  DepartmentOccupancy as DepartmentOccupancyResponse,
} from '@hospital/contracts';
import { Department as DepartmentEntity } from '../../domain/department';
import { DepartmentOccupancy } from '../../domain/department-occupancy';

/** Converte objetos de domínio para o formato do contrato HTTP. */
export const DepartmentPresenter = {
  toResponse(department: DepartmentEntity): Department {
    return { id: department.id, name: department.name, totalBeds: department.totalBeds };
  },

  toOccupancyResponse(occupancy: DepartmentOccupancy): DepartmentOccupancyResponse {
    return {
      departmentId: occupancy.department.id,
      departmentName: occupancy.department.name,
      totalBeds: occupancy.department.totalBeds,
      occupiedBeds: occupancy.occupiedBeds,
      occupancyRate: occupancy.rate.value,
    };
  },
};
