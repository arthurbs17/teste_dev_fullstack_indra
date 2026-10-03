import type { AdmissionStatus } from './mock';

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
export const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const fmtNum = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });
export const age = (birth: string) =>
  Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000));
export const stayDays = (from: string, to: string | null) =>
  Math.max(
    0,
    Math.round(
      (Math.min(to ? new Date(to).getTime() : Date.now(), Date.now()) - new Date(from).getTime()) /
        86400000,
    ),
  );

export const STATUS_LABEL: Record<AdmissionStatus, string> = {
  internado: 'Internado',
  alta: 'Alta',
  obito: 'Óbito',
  transferido: 'Transferido',
};
export const STATUS_CLASS: Record<AdmissionStatus, string> = {
  internado: 'bg-primary/10 text-primary',
  alta: 'bg-success/15 text-success',
  obito: 'bg-destructive/10 text-destructive',
  transferido: 'bg-warning/20 text-foreground',
};
