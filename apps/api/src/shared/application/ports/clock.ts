/**
 * Fonte da data de referência. Os casos de uso usam este port em vez de
 * `new Date()` para que todas as consultas de um request usem o mesmo
 * instante e para que os testes sejam determinísticos.
 */
export abstract class Clock {
  abstract now(): Date;
}
