import type { AdmissionStatus, ExamStatus, StaffRole } from '@hospital/contracts';

const EMPTY = '—';

// Datas da API vêm em UTC (fuso do banco); exibimos no mesmo fuso para não
// deslocar o dia de internações perto da meia-noite.
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

export const fmtPct = (value: number | null) =>
  value === null
    ? EMPTY
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const fmtNum = (value: number | null, decimals = 1) =>
  value === null ? EMPTY : value.toLocaleString('pt-BR', { maximumFractionDigits: decimals });

export const fmtDays = (value: number | null) => (value === null ? EMPTY : `${fmtNum(value)} d`);

/** Data inicial (YYYY-MM-DD, UTC) dos últimos `days` dias, contando hoje. */
export function periodStart(days: number, now = new Date()): string {
  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  return start.toISOString().slice(0, 10);
}

export const STATUS_LABEL: Record<AdmissionStatus, string> = {
  internado: 'Internado',
  alta: 'Alta',
  obito: 'Óbito',
};

export const STATUS_CLASS: Record<AdmissionStatus, string> = {
  internado: 'bg-primary/10 text-primary',
  alta: 'bg-success/15 text-success',
  obito: 'bg-destructive/10 text-destructive',
};

export const EXAM_STATUS_LABEL: Record<ExamStatus, string> = {
  solicitado: 'Solicitado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

export const EXAM_STATUS_CLASS: Record<ExamStatus, string> = {
  solicitado: 'bg-warning/20 text-foreground',
  em_andamento: 'bg-primary/10 text-primary',
  concluido: 'bg-success/15 text-success',
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  médico: 'Médico(a)',
  enfermeiro: 'Enfermeiro(a)',
};
