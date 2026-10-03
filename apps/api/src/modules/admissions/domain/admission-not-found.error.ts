import { NotFoundError } from '../../../shared/domain/domain-error';

export class AdmissionNotFoundError extends NotFoundError {
  constructor(id: number) {
    super(`Internação ${id} não encontrada.`);
  }
}
