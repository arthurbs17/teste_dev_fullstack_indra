/**
 * Erro de negócio. Não conhece HTTP: o adapter de entrada decide como
 * traduzir cada tipo para a resposta adequada.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Recurso solicitado não existe. */
export class NotFoundError extends DomainError {}

/** A entrada é bem formada, mas viola uma regra de negócio. */
export class BusinessRuleViolationError extends DomainError {}
