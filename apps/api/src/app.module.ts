import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { DepartmentsModule } from './modules/departments/departments.module';
import { HealthModule } from './modules/health/health.module';
import { ClockModule } from './shared/infrastructure/clock/clock.module';
import { ConfigModule } from './shared/infrastructure/config/config.module';
import { ProblemDetailsFilter } from './shared/infrastructure/http/problem-details.filter';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, ClockModule, HealthModule, DepartmentsModule],
  providers: [
    // Valida entrada (query, params, body) com os schemas de @hospital/contracts
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Valida as respostas contra o contrato antes de enviá-las
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
