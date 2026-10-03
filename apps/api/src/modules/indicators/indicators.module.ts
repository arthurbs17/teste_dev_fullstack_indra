import { Module } from '@nestjs/common';
import { Clock } from '../../shared/application/ports/clock';
import { IndicatorsQuery } from './application/ports/indicators-query';
import { GetDailyCensusUseCase } from './application/use-cases/get-daily-census.use-case';
import { GetKpisUseCase } from './application/use-cases/get-kpis.use-case';
import { KpisController } from './infrastructure/http/kpis.controller';
import { OccupancyController } from './infrastructure/http/occupancy.controller';
import { PrismaIndicatorsQuery } from './infrastructure/persistence/prisma-indicators.query';

@Module({
  controllers: [KpisController, OccupancyController],
  providers: [
    { provide: IndicatorsQuery, useClass: PrismaIndicatorsQuery },
    {
      provide: GetKpisUseCase,
      useFactory: (query: IndicatorsQuery, clock: Clock) => new GetKpisUseCase(query, clock),
      inject: [IndicatorsQuery, Clock],
    },
    {
      provide: GetDailyCensusUseCase,
      useFactory: (query: IndicatorsQuery, clock: Clock) => new GetDailyCensusUseCase(query, clock),
      inject: [IndicatorsQuery, Clock],
    },
  ],
})
export class IndicatorsModule {}
