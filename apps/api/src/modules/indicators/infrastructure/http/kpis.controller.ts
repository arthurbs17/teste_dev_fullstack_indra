import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../../../../shared/infrastructure/http/api-problem-responses.decorator';
import { GetKpisUseCase } from '../../application/use-cases/get-kpis.use-case';
import { KpisDto, KpisQueryDto } from './indicators.dto';
import { IndicatorsPresenter } from './indicators.presenter';

@ApiTags('indicators')
@Controller('kpis')
export class KpisController {
  constructor(private readonly getKpis: GetKpisUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Indicadores gerais do hospital',
    description:
      'Ocupação, internações ativas e exames pendentes refletem o momento atual; os demais ' +
      'indicadores consideram o período (padrão: últimos 30 dias).',
  })
  @ZodResponse({ status: HttpStatus.OK, type: KpisDto })
  @ApiProblemResponses(400, 422)
  async kpis(@Query() query: KpisQueryDto) {
    return IndicatorsPresenter.toKpisResponse(await this.getKpis.execute(query));
  }
}
