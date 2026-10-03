import { OccupancyRate } from '../../../shared/domain/occupancy-rate';
import { Department } from './department';

export class DepartmentOccupancy {
  readonly rate: OccupancyRate;

  constructor(
    readonly department: Department,
    readonly occupiedBeds: number,
  ) {
    this.rate = OccupancyRate.of(occupiedBeds, department.totalBeds);
  }
}
