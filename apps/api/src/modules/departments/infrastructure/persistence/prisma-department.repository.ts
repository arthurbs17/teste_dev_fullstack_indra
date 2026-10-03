import { Injectable } from '@nestjs/common';
import { ACTIVE_ADMISSION_STATUS } from '../../../../shared/domain/admission-status';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  DepartmentOccupancyRow,
  DepartmentRepository,
} from '../../application/ports/department-repository';
import { Department } from '../../domain/department';

interface OccupancySqlRow {
  id: number;
  name: string;
  total_beds: number;
  occupied_beds: number;
}

@Injectable()
export class PrismaDepartmentRepository extends DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<Department[]> {
    return this.prisma.department.findMany({
      select: { id: true, name: true, totalBeds: true },
      orderBy: { name: 'asc' },
    });
  }

  async findCurrentOccupancy(): Promise<DepartmentOccupancyRow[]> {
    // LEFT JOIN mantém departamentos sem internações ativas (ocupação 0).
    // COUNT(DISTINCT bed_number) evita contar duas vezes um leito caso duas
    // internações ativas apontem para o mesmo leito.
    const rows = await this.prisma.$queryRaw<OccupancySqlRow[]>`
      SELECT d.id,
             d.name,
             d.total_beds,
             COUNT(DISTINCT a.bed_number)::int AS occupied_beds
        FROM departments d
        LEFT JOIN admissions a
          ON a.department_id = d.id
         AND a.status = ${ACTIVE_ADMISSION_STATUS}
       GROUP BY d.id, d.name, d.total_beds
       ORDER BY d.name
    `;

    return rows.map((row) => ({
      department: { id: row.id, name: row.name, totalBeds: row.total_beds },
      occupiedBeds: row.occupied_beds,
    }));
  }
}
