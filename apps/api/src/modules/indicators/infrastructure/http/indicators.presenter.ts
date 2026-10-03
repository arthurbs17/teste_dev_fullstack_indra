import type { DailyCensus as DailyCensusResponse, Kpis } from '@hospital/contracts';
import { DailyCensus } from '../../domain/daily-census';
import { KpiReport } from '../../domain/kpi-report';

export const IndicatorsPresenter = {
  toKpisResponse(report: KpiReport): Kpis {
    return {
      period: { from: report.period.from, to: report.period.to },
      referenceDate: report.referenceDate.toISOString(),
      occupancy: {
        occupiedBeds: report.occupancy.occupiedBeds,
        totalBeds: report.occupancy.totalBeds,
        rate: report.occupancy.rate.value,
      },
      activeAdmissions: report.activeAdmissions,
      admissionsInPeriod: report.admissionsInPeriod,
      dischargesInPeriod: report.dischargesInPeriod,
      averageLengthOfStayDays: report.averageLengthOfStayDays,
      mortalityRate: report.mortalityRate,
      pendingExams: report.pendingExams,
      averageExamTurnaroundHours: report.averageExamTurnaroundHours,
    };
  },

  toDailyCensusResponse(census: DailyCensus): DailyCensusResponse {
    return {
      period: { from: census.period.from, to: census.period.to },
      departmentId: census.departmentId,
      totalBeds: census.totalBeds,
      points: census.points.map((point) => ({
        date: point.date,
        occupiedBeds: point.occupiedBeds,
        occupancyRate: point.occupancyRate.value,
        admissions: point.admissions,
        discharges: point.discharges,
      })),
    };
  },
};
