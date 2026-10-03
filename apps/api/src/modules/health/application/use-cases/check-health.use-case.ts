import { DatabaseHealth } from '../ports/database-health';

export interface HealthReport {
  status: 'ok' | 'error';
  database: 'up' | 'down';
}

export class CheckHealthUseCase {
  constructor(private readonly database: DatabaseHealth) {}

  async execute(): Promise<HealthReport> {
    const databaseUp = await this.database.isUp();
    return {
      status: databaseUp ? 'ok' : 'error',
      database: databaseUp ? 'up' : 'down',
    };
  }
}
