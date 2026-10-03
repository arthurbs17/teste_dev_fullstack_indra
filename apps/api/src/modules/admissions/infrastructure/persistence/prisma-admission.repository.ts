import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { ACTIVE_ADMISSION_STATUS } from '../../../../shared/domain/admission-status';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  AdmissionFilters,
  AdmissionPage,
  AdmissionPageRequest,
  AdmissionRepository,
  AdmissionSortField,
} from '../../application/ports/admission-repository';
import { AdmissionDetail } from '../../domain/admission-detail';
import { AdmissionListSqlRow, AdmissionMapper } from './admission.mapper';

/**
 * Colunas de ordenação vêm deste mapa fixo, nunca da entrada do usuário
 * (que já é validada contra a mesma lista no contrato).
 */
const SORT_COLUMNS: Record<AdmissionSortField, (referenceDate: Date) => Prisma.Sql> = {
  admissionDate: () => Prisma.sql`a.admission_date`,
  dischargeDate: () => Prisma.sql`a.discharge_date`,
  patientName: () => Prisma.sql`p.name`,
  departmentName: () => Prisma.sql`d.name`,
  lengthOfStay: (referenceDate) => Prisma.sql`(
    CASE WHEN a.status = ${ACTIVE_ADMISSION_STATUS} THEN ${referenceDate.toISOString()}::timestamp
         ELSE LEAST(a.discharge_date, ${referenceDate.toISOString()}::timestamp)
    END - a.admission_date
  )`,
};

@Injectable()
export class PrismaAdmissionRepository extends AdmissionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPage(request: AdmissionPageRequest): Promise<AdmissionPage> {
    const where = buildWhere(request.filters);
    const orderColumn = SORT_COLUMNS[request.sort.field](request.referenceDate);
    const direction = request.sort.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const offset = (request.page - 1) * request.pageSize;

    const fromClause = Prisma.sql`
      FROM admissions a
      JOIN patients p    ON p.id = a.patient_id
      JOIN departments d ON d.id = a.department_id
      LEFT JOIN staff s  ON s.id = a.attending_staff_id
      ${where}
    `;

    // Contagem separada (e não COUNT(*) OVER()) para retornar o total mesmo
    // quando a página pedida está além do último resultado.
    const [rows, [count]] = await Promise.all([
      this.prisma.$queryRaw<AdmissionListSqlRow[]>`
        SELECT a.id, a.bed_number, a.admission_date, a.discharge_date, a.status, a.diagnosis,
               p.id AS patient_id, p.name AS patient_name, p.document AS patient_document,
               d.id AS department_id, d.name AS department_name,
               s.id AS staff_id, s.name AS staff_name
        ${fromClause}
        ORDER BY ${orderColumn} ${direction} NULLS LAST, a.id ${direction}
        LIMIT ${request.pageSize} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS total ${fromClause}`,
    ]);

    return { items: rows.map(AdmissionMapper.fromListRow), total: count?.total ?? 0 };
  }

  async findDetailById(id: number): Promise<AdmissionDetail | null> {
    const row = await this.prisma.admission.findUnique({
      where: { id },
      include: {
        patient: true,
        department: true,
        attendingStaff: true,
        exams: { orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }] },
        vitalSigns: { orderBy: [{ measuredAt: 'asc' }, { id: 'asc' }] },
      },
    });
    return row ? AdmissionMapper.fromDetailRow(row) : null;
  }
}

function buildWhere(filters: AdmissionFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.status) conditions.push(Prisma.sql`a.status = ${filters.status}`);
  if (filters.departmentId) conditions.push(Prisma.sql`a.department_id = ${filters.departmentId}`);
  if (filters.from) conditions.push(Prisma.sql`a.admission_date >= ${filters.from}::date`);
  if (filters.to) {
    conditions.push(Prisma.sql`a.admission_date < ${filters.to}::date + 1`);
  }
  if (filters.search) {
    const pattern = `%${escapeLike(filters.search)}%`;
    conditions.push(Prisma.sql`(
      p.name ILIKE ${pattern} OR p.document ILIKE ${pattern} OR a.diagnosis ILIKE ${pattern}
    )`);
  }

  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

/** Escapa curingas do LIKE para que "%" e "_" na busca sejam literais. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
