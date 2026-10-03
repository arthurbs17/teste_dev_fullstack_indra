import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { CheckHealthUseCase } from '../../application/use-cases/check-health.use-case';
import { HealthDto } from './health.dto';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: HealthDto, description: 'API e banco disponíveis' })
  @ApiServiceUnavailableResponse({ description: 'Banco indisponível', type: HealthDto.Output })
  async check(@Res({ passthrough: true }) response: Response) {
    const report = await this.checkHealth.execute();
    if (report.status !== 'ok') response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
