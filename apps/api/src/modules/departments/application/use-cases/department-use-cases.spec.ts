import { Department } from '../../domain/department';
import { DepartmentOccupancyRow, DepartmentRepository } from '../ports/department-repository';
import { GetDepartmentOccupancyUseCase } from './get-department-occupancy.use-case';
import { ListDepartmentsUseCase } from './list-departments.use-case';

const uti: Department = { id: 3, name: 'UTI', totalBeds: 15 };
const cirurgia: Department = { id: 5, name: 'Cirurgia', totalBeds: 15 };
const pediatria: Department = { id: 4, name: 'Pediatria', totalBeds: 20 };

class InMemoryDepartmentRepository extends DepartmentRepository {
  constructor(private readonly rows: DepartmentOccupancyRow[]) {
    super();
  }

  async findAll(): Promise<Department[]> {
    return this.rows.map((row) => row.department);
  }

  async findCurrentOccupancy(): Promise<DepartmentOccupancyRow[]> {
    return this.rows;
  }
}

describe('ListDepartmentsUseCase', () => {
  it('retorna os departamentos do repositório', async () => {
    const repository = new InMemoryDepartmentRepository([{ department: uti, occupiedBeds: 0 }]);
    await expect(new ListDepartmentsUseCase(repository).execute()).resolves.toEqual([uti]);
  });
});

describe('GetDepartmentOccupancyUseCase', () => {
  it('calcula a taxa e ordena da maior ocupação para a menor', async () => {
    const repository = new InMemoryDepartmentRepository([
      { department: pediatria, occupiedBeds: 5 },
      { department: uti, occupiedBeds: 0 },
      { department: cirurgia, occupiedBeds: 3 },
    ]);

    const result = await new GetDepartmentOccupancyUseCase(repository).execute();

    expect(result.map((o) => [o.department.name, o.rate.value])).toEqual([
      ['Pediatria', 0.25],
      ['Cirurgia', 0.2],
      ['UTI', 0],
    ]);
  });

  it('desempata pelo nome quando a taxa é igual', async () => {
    const repository = new InMemoryDepartmentRepository([
      { department: uti, occupiedBeds: 0 },
      { department: cirurgia, occupiedBeds: 0 },
    ]);

    const result = await new GetDepartmentOccupancyUseCase(repository).execute();

    expect(result.map((o) => o.department.name)).toEqual(['Cirurgia', 'UTI']);
  });
});
