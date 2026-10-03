import { round } from '../../../shared/domain/math';

export type ExamStatus = 'solicitado' | 'em_andamento' | 'concluido';

export interface ExamProps {
  id: number;
  examType: string;
  requestedAt: Date;
  resultAt: Date | null;
  status: ExamStatus;
  resultValue: string | null;
}

export class Exam {
  constructor(readonly props: ExamProps) {}

  /** Horas entre a solicitação e o resultado; null enquanto não há resultado. */
  get turnaroundHours(): number | null {
    if (!this.props.resultAt) return null;
    const ms = this.props.resultAt.getTime() - this.props.requestedAt.getTime();
    return round(ms / 3_600_000, 1);
  }
}
