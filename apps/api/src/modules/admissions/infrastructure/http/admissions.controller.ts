import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiProblemResponses } from '../../../../shared/infrastructure/http/api-problem-responses.decorator';
import { GetAdmissionDetailUseCase } from '../../application/use-cases/get-admission-detail.use-case';
import { ListAdmissionsUseCase } from '../../application/use-cases/list-admissions.use-case';
import {
  AdmissionDetailDto,
  AdmissionIdParamDto,
  AdmissionListDto,
  ListAdmissionsQueryDto,
} from './admissions.dto';
import { AdmissionsPresenter } from './admissions.presenter';

@ApiTags('admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(
    private readonly listAdmissions: ListAdmissionsUseCase,
    private readonly getAdmissionDetail: GetAdmissionDetailUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista internações com filtros, paginação e ordenação',
    description:
      'Filtros por status, departamento, período da data de internação e busca por nome ou ' +
      'documento do paciente, ou diagnóstico.',
  })
  @ZodResponse({ status: HttpStatus.OK, type: AdmissionListDto })
  @ApiProblemResponses(400)
  async list(@Query() query: ListAdmissionsQueryDto) {
    return AdmissionsPresenter.toListResponse(await this.listAdmissions.execute(query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da internação com exames e sinais vitais' })
  @ZodResponse({ status: HttpStatus.OK, type: AdmissionDetailDto })
  @ApiProblemResponses(400, 404)
  async detail(@Param() params: AdmissionIdParamDto) {
    return AdmissionsPresenter.toDetailResponse(await this.getAdmissionDetail.execute(params.id));
  }
}
