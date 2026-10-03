import { Module } from '@nestjs/common';
import { DatabaseHealth } from './application/ports/database-health';
import { CheckHealthUseCase } from './application/use-cases/check-health.use-case';
import { HealthController } from './infrastructure/http/health.controller';
import { PrismaDatabaseHealth } from './infrastructure/persistence/prisma-database-health';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: DatabaseHealth, useClass: PrismaDatabaseHealth },
    {
      provide: CheckHealthUseCase,
      useFactory: (database: DatabaseHealth) => new CheckHealthUseCase(database),
      inject: [DatabaseHealth],
    },
  ],
})
export class HealthModule {}
