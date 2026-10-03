import { Injectable } from '@nestjs/common';
import { ACTIVE_ADMISSION_STATUS } from '../../../../shared/domain/admission-status';
import { Period } from '../../../../shared/domain/period';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  CensusDayFigures,
  IndicatorsQuery,
  KpiFigures,
} from '../../application/ports/indicators-query';

interface KpiSqlRow {
  total_beds: number;
  occupied_beds: number;
  active_admissions: number;
  pending_exams: number;
  admissions_in_period: number;
  closed_in_period: number;
  deaths_in_period: number;
  avg_length_of_stay_hours: number | null;
  avg_exam_turnaround_hours: number | null;
}

interface CensusSqlRow {
  date: string;
  occupied_beds: number;
  admissions: number;
  discharges: number;
}

/**
 * Adapter de leitura dos indicadores. As colunas são TIMESTAMP sem fuso
 * (UTC); os instantes vão como ISO e o Postgres ignora o "Z" ao converter
 * para timestamp, mantendo o horário UTC.
 */
@Injectable()
export class PrismaIndicatorsQuery extends IndicatorsQuery {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getKpiFigures(period: Period, referenceDate: Date): Promise<KpiFigures> {
    const [row] = await this.prisma.$queryRaw<KpiSqlRow[]>`
      WITH params AS (
        SELECT ${period.start.toISOString()}::timestamp        AS period_start,
               ${period.endExclusive.toISOString()}::timestamp AS period_end,
               ${referenceDate.toISOString()}::timestamp      AS reference_at
      ),
      -- Saída efetiva: nula se a internação está ativa; senão, limitada à data
      -- de referência (o seed tem altas com discharge_date no futuro).
      admissions_effective AS (
        SELECT a.status,
               a.admission_date,
               CASE WHEN a.status = ${ACTIVE_ADMISSION_STATUS} THEN NULL
                    ELSE LEAST(a.discharge_date, p.reference_at)
               END AS effective_discharge
          FROM admissions a
         CROSS JOIN params p
      ),
      beds AS (
        SELECT COALESCE(SUM(total_beds), 0)::int AS total_beds FROM departments
      ),
      current_occupancy AS (
        SELECT COUNT(*)::int                                    AS active_admissions,
               COUNT(DISTINCT (department_id, bed_number))::int AS occupied_beds
          FROM admissions
         WHERE status = ${ACTIVE_ADMISSION_STATUS}
      ),
      period_admissions AS (
        SELECT COUNT(*) FILTER (
                 WHERE a.admission_date >= p.period_start AND a.admission_date < p.period_end
               )::int AS admissions_in_period,
               COUNT(*) FILTER (
                 WHERE a.effective_discharge >= p.period_start AND a.effective_discharge < p.period_end
               )::int AS closed_in_period,
               COUNT(*) FILTER (
                 WHERE a.status = 'obito'
                   AND a.effective_discharge >= p.period_start AND a.effective_discharge < p.period_end
               )::int AS deaths_in_period,
               (AVG(EXTRACT(EPOCH FROM a.effective_discharge - a.admission_date) / 3600) FILTER (
                 WHERE a.effective_discharge >= p.period_start AND a.effective_discharge < p.period_end
               ))::float8 AS avg_length_of_stay_hours
          FROM admissions_effective a
         CROSS JOIN params p
      ),
      exam_stats AS (
        SELECT COUNT(*) FILTER (WHERE e.status <> 'concluido')::int AS pending_exams,
               (AVG(EXTRACT(EPOCH FROM e.result_at - e.requested_at) / 3600) FILTER (
                 WHERE e.status = 'concluido'
                   AND e.result_at >= p.period_start
                   AND e.result_at < LEAST(p.period_end, p.reference_at)
               ))::float8 AS avg_exam_turnaround_hours
          FROM exams e
         CROSS JOIN params p
      )
      SELECT * FROM beds, current_occupancy, period_admissions, exam_stats
    `;

    if (!row) throw new Error('Consulta de KPIs não retornou linhas');

    return {
      totalBeds: row.total_beds,
      occupiedBeds: row.occupied_beds,
      activeAdmissions: row.active_admissions,
      pendingExams: row.pending_exams,
      admissionsInPeriod: row.admissions_in_period,
      closedInPeriod: row.closed_in_period,
      deathsInPeriod: row.deaths_in_period,
      averageLengthOfStayHours: row.avg_length_of_stay_hours,
      averageExamTurnaroundHours: row.avg_exam_turnaround_hours,
    };
  }

  async getTotalBeds(departmentId: number | null): Promise<number | null> {
    if (departmentId === null) {
      const { _sum } = await this.prisma.department.aggregate({ _sum: { totalBeds: true } });
      return _sum.totalBeds ?? 0;
    }
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { totalBeds: true },
    });
    return department?.totalBeds ?? null;
  }

  async getDailyCensus(
    period: Period,
    referenceDate: Date,
    departmentId: number | null,
  ): Promise<CensusDayFigures[]> {
    // Censo = leitos ocupados no fim de cada dia (ou na data de referência,
    // para o dia de hoje). Assim o último ponto bate com a ocupação atual.
    const rows = await this.prisma.$queryRaw<CensusSqlRow[]>`
      WITH params AS (
        SELECT ${referenceDate.toISOString()}::timestamp AS reference_at,
               ${departmentId}::int                      AS department_id
      ),
      days AS (
        SELECT g.day::date AS day
          FROM generate_series(${period.from}::date, ${period.to}::date, interval '1 day') AS g(day)
      ),
      scoped AS (
        SELECT a.department_id,
               a.bed_number,
               a.admission_date,
               CASE WHEN a.status = ${ACTIVE_ADMISSION_STATUS} THEN NULL
                    ELSE LEAST(a.discharge_date, p.reference_at)
               END AS effective_discharge
          FROM admissions a
         CROSS JOIN params p
         WHERE p.department_id IS NULL OR a.department_id = p.department_id
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             occupancy.occupied_beds,
             movement.admissions,
             movement.discharges
        FROM days d
       CROSS JOIN params p
       CROSS JOIN LATERAL (
         SELECT LEAST((d.day + 1)::timestamp, p.reference_at) AS census_at
       ) c
       CROSS JOIN LATERAL (
         SELECT COUNT(DISTINCT (s.department_id, s.bed_number))::int AS occupied_beds
           FROM scoped s
          WHERE s.admission_date < c.census_at
            AND (s.effective_discharge IS NULL OR s.effective_discharge > c.census_at)
       ) occupancy
       CROSS JOIN LATERAL (
         SELECT COUNT(*) FILTER (
                  WHERE s.admission_date >= d.day AND s.admission_date < d.day + 1
                )::int AS admissions,
                COUNT(*) FILTER (
                  WHERE s.effective_discharge >= d.day AND s.effective_discharge < d.day + 1
                )::int AS discharges
           FROM scoped s
       ) movement
       ORDER BY d.day
    `;

    return rows.map((row) => ({
      date: row.date,
      occupiedBeds: row.occupied_beds,
      admissions: row.admissions,
      discharges: row.discharges,
    }));
  }
}
