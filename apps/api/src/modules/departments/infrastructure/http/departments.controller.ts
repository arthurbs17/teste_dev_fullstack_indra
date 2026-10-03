import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { GetDepartmentOccupancyUseCase } from '../../application/use-cases/get-department-occupancy.use-case';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments.use-case';
import { DepartmentDto, DepartmentOccupancyDto } from './department.dto';
import { DepartmentPresenter } from './department.presenter';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly listDepartments: ListDepartmentsUseCase,
    private readonly getOccupancy: GetDepartmentOccupancyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os departamentos (usado nos filtros)' })
  @ZodResponse({ status: HttpStatus.OK, type: [DepartmentDto] })
  async list() {
    const departments = await this.listDepartments.execute();
    return departments.map(DepartmentPresenter.toResponse);
  }

  @Get('occupancy')
  @ApiOperation({
    summary: 'Ocupação atual de leitos por departamento',
    description:
      'Ordenado da maior para a menor taxa. Leito ocupado = internação com status "internado".',
  })
  @ZodResponse({ status: HttpStatus.OK, type: [DepartmentOccupancyDto] })
  async occupancy() {
    const occupancy = await this.getOccupancy.execute();
    return occupancy.map(DepartmentPresenter.toOccupancyResponse);
  }
}
