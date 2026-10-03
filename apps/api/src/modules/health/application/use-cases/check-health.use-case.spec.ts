import { DatabaseHealth } from '../ports/database-health';
import { CheckHealthUseCase } from './check-health.use-case';

class FakeDatabaseHealth extends DatabaseHealth {
  constructor(private readonly up: boolean) {
    super();
  }

  async isUp(): Promise<boolean> {
    return this.up;
  }
}

describe('CheckHealthUseCase', () => {
  it('reporta ok quando o banco responde', async () => {
    const useCase = new CheckHealthUseCase(new FakeDatabaseHealth(true));
    await expect(useCase.execute()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('reporta erro quando o banco não responde', async () => {
    const useCase = new CheckHealthUseCase(new FakeDatabaseHealth(false));
    await expect(useCase.execute()).resolves.toEqual({ status: 'error', database: 'down' });
  });
});
