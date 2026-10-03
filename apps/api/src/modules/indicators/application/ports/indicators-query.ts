import { Period } from '../../../../shared/domain/period';

/** Números brutos dos KPIs; as razões e arredondamentos ficam no caso de uso. */
export interface KpiFigures {
  totalBeds: number;
  occupiedBeds: number;
  activeAdmissions: number;
  pendingExams: number;
  admissionsInPeriod: number;
  /** Internações encerradas (alta ou óbito) no período. */
  closedInPeriod: number;
  deathsInPeriod: number;
  averageLengthOfStayHours: number | null;
  averageExamTurnaroundHours: number | null;
}

export interface CensusDayFigures {
  date: string;
  occupiedBeds: number;
  admissions: number;
  discharges: number;
}

/**
 * Query port do lado de leitura: agregações calculadas pelo adapter (SQL).
 *
 * Regras que toda implementação deve seguir:
 * - internação ativa = status "internado";
 * - saída efetiva = nula se ativa; senão, a menor entre discharge_date e a
 *   data de referência (o seed tem altas com data futura);
 * - leito ocupado = par (departamento, leito) distinto com internação ativa.
 */
export abstract class IndicatorsQuery {
  abstract getKpiFigures(period: Period, referenceDate: Date): Promise<KpiFigures>;

  /** Total de leitos do departamento (ou do hospital); null se o departamento não existe. */
  abstract getTotalBeds(departmentId: number | null): Promise<number | null>;

  /** Um item por dia do período, em ordem cronológica. */
  abstract getDailyCensus(
    period: Period,
    referenceDate: Date,
    departmentId: number | null,
  ): Promise<CensusDayFigures[]>;
}
