import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../../../../shared/infrastructure/http/api-problem-responses.decorator';
import { GetDailyCensusUseCase } from '../../application/use-cases/get-daily-census.use-case';
import { DailyCensusDto, DailyCensusQueryDto } from './indicators.dto';
import { IndicatorsPresenter } from './indicators.presenter';

@ApiTags('indicators')
@Controller('occupancy')
export class OccupancyController {
  constructor(private readonly getDailyCensus: GetDailyCensusUseCase) {}

  @Get('daily')
  @ApiOperation({
    summary: 'Censo diário de leitos ocupados',
    description:
      'Leitos ocupados no fim de cada dia do período (o dia atual usa o momento da consulta). ' +
      'Filtrável por departamento.',
  })
  @ZodResponse({ status: HttpStatus.OK, type: DailyCensusDto })
  @ApiProblemResponses(400, 404, 422)
  async daily(@Query() query: DailyCensusQueryDto) {
    return IndicatorsPresenter.toDailyCensusResponse(await this.getDailyCensus.execute(query));
  }
}
