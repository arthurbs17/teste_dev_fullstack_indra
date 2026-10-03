import { Clock } from '../../../../shared/application/ports/clock';
import { Admission } from '../../domain/admission';
import { AdmissionDetail } from '../../domain/admission-detail';
import { AdmissionNotFoundError } from '../../domain/admission-not-found.error';
import {
  AdmissionPage,
  AdmissionPageRequest,
  AdmissionRepository,
} from '../ports/admission-repository';
import { GetAdmissionDetailUseCase } from './get-admission-detail.use-case';
import { ListAdmissionsUseCase } from './list-admissions.use-case';

const reference = new Date('2026-10-03T12:00:00.000Z');

class FixedClock extends Clock {
  now(): Date {
    return reference;
  }
}

const admission = new Admission({
  id: 7,
  patient: { id: 3, name: 'Maria Clara Souza', document: 'PAC-0002' },
  department: { id: 5, name: 'Cirurgia' },
  attendingStaff: { id: 14, name: 'Eduardo Carvalho' },
  bedNumber: 13,
  admissionDate: new Date('2026-10-01T12:00:00.000Z'),
  dischargeDate: null,
  status: 'internado',
  diagnosis: 'Apendicite aguda',
});

const detail: AdmissionDetail = {
  admission,
  patient: {
    id: 3,
    name: 'Maria Clara Souza',
    document: 'PAC-0002',
    birthDate: new Date('1990-12-25T00:00:00.000Z'),
    gender: 'F',
  },
  attendingStaff: { id: 14, name: 'Eduardo Carvalho', role: 'médico' },
  exams: [],
  vitalSigns: [],
};

class InMemoryAdmissionRepository extends AdmissionRepository {
  lastRequest?: AdmissionPageRequest;

  constructor(private readonly total = 45) {
    super();
  }

  async findPage(request: AdmissionPageRequest): Promise<AdmissionPage> {
    this.lastRequest = request;
    return { items: [admission], total: this.total };
  }

  async findDetailById(id: number): Promise<AdmissionDetail | null> {
    return id === admission.id ? detail : null;
  }
}

describe('ListAdmissionsUseCase', () => {
  const input = {
    page: 2,
    pageSize: 20,
    sort: 'lengthOfStay' as const,
    order: 'asc' as const,
    status: 'internado' as const,
    search: 'maria',
  };

  it('repassa filtros, ordenação e data de referência ao repositório', async () => {
    const repository = new InMemoryAdmissionRepository();
    await new ListAdmissionsUseCase(repository, new FixedClock()).execute(input);

    expect(repository.lastRequest).toEqual({
      filters: { status: 'internado', search: 'maria' },
      sort: { field: 'lengthOfStay', order: 'asc' },
      page: 2,
      pageSize: 20,
      referenceDate: reference,
    });
  });

  it('calcula o total de páginas e a duração de cada internação', async () => {
    const result = await new ListAdmissionsUseCase(
      new InMemoryAdmissionRepository(45),
      new FixedClock(),
    ).execute(input);

    expect(result.totalPages).toBe(3);
    expect(result.items[0]?.lengthOfStayDays).toBe(2);
  });

  it('retorna zero páginas quando não há resultados', async () => {
    const result = await new ListAdmissionsUseCase(
      new InMemoryAdmissionRepository(0),
      new FixedClock(),
    ).execute(input);

    expect(result.totalPages).toBe(0);
  });
});

describe('GetAdmissionDetailUseCase', () => {
  it('calcula idade do paciente e duração da internação', async () => {
    const result = await new GetAdmissionDetailUseCase(
      new InMemoryAdmissionRepository(),
      new FixedClock(),
    ).execute(7);

    expect(result.patientAge).toBe(35);
    expect(result.lengthOfStayDays).toBe(2);
  });

  it('lança AdmissionNotFoundError para id inexistente', async () => {
    await expect(
      new GetAdmissionDetailUseCase(new InMemoryAdmissionRepository(), new FixedClock()).execute(
        999,
      ),
    ).rejects.toThrow(AdmissionNotFoundError);
  });
});
