import { BusinessRuleViolationError } from './domain-error';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 366;

/**
 * Intervalo de dias inteiros (inclusive), em UTC, que é o fuso do banco.
 * Datas são strings YYYY-MM-DD para evitar ambiguidade de fuso.
 */
export class Period {
  private constructor(
    readonly from: string,
    readonly to: string,
  ) {}

  /**
   * Resolve o período pedido: sem "to", usa o dia da data de referência; sem
   * "from", usa os últimos DEFAULT_PERIOD_DAYS dias até "to".
   */
  static resolve(input: { from?: string; to?: string }, referenceDate: Date): Period {
    const to = input.to ?? toIsoDate(referenceDate);
    const from = input.from ?? addDays(to, -(DEFAULT_PERIOD_DAYS - 1));

    if (from > to) {
      throw new BusinessRuleViolationError('A data inicial deve ser menor ou igual à final.');
    }
    const period = new Period(from, to);
    if (period.days > MAX_PERIOD_DAYS) {
      throw new BusinessRuleViolationError(`O período não pode passar de ${MAX_PERIOD_DAYS} dias.`);
    }
    return period;
  }

  /** Quantidade de dias, contando o primeiro e o último. */
  get days(): number {
    return (Date.parse(this.to) - Date.parse(this.from)) / DAY_MS + 1;
  }

  /** Primeiro instante do período. */
  get start(): Date {
    return new Date(`${this.from}T00:00:00.000Z`);
  }

  /** Primeiro instante após o período (limite exclusivo). */
  get endExclusive(): Date {
    return new Date(`${addDays(this.to, 1)}T00:00:00.000Z`);
  }

  /** Recorta o fim do período no dia da data de referência (sem dias futuros). */
  clampTo(referenceDate: Date): Period {
    const today = toIsoDate(referenceDate);
    if (this.to <= today) return this;
    return new Period(this.from, today < this.from ? this.from : today);
  }
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(Date.parse(isoDate) + days * DAY_MS));
}
