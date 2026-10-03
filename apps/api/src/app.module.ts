import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { HealthModule } from './modules/health/health.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { ClockModule } from './shared/infrastructure/clock/clock.module';
import { AppConfig } from './shared/infrastructure/config/app-config';
import { ConfigModule } from './shared/infrastructure/config/config.module';
import { ProblemDetailsFilter } from './shared/infrastructure/http/problem-details.filter';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [{ ttl: 60_000, limit: config.env.RATE_LIMIT_PER_MINUTE }],
    }),
    PrismaModule,
    ClockModule,
    HealthModule,
    DepartmentsModule,
    IndicatorsModule,
    AdmissionsModule,
  ],
  providers: [
    // Limite de requisições por IP (o /health fica de fora)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Valida entrada (query, params, body) com os schemas de @hospital/contracts
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Valida as respostas contra o contrato antes de enviá-las
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
