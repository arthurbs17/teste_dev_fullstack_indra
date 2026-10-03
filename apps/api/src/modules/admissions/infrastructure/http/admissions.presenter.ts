import type {
  AdmissionDetail as AdmissionDetailResponse,
  AdmissionList,
  AdmissionListItem,
} from '@hospital/contracts';
import { AdmissionDetailResult } from '../../application/use-cases/get-admission-detail.use-case';
import { AdmissionListResult } from '../../application/use-cases/list-admissions.use-case';
import { Admission } from '../../domain/admission';

function toListItem(admission: Admission, lengthOfStayDays: number): AdmissionListItem {
  const { props } = admission;
  return {
    id: props.id,
    patient: props.patient,
    department: props.department,
    attendingStaff: props.attendingStaff,
    bedNumber: props.bedNumber,
    admissionDate: props.admissionDate.toISOString(),
    dischargeDate: props.dischargeDate?.toISOString() ?? null,
    status: props.status,
    diagnosis: props.diagnosis,
    lengthOfStayDays,
  };
}

export const AdmissionsPresenter = {
  toListResponse(result: AdmissionListResult): AdmissionList {
    return {
      data: result.items.map(({ admission, lengthOfStayDays }) =>
        toListItem(admission, lengthOfStayDays),
      ),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    };
  },

  toDetailResponse({
    detail,
    lengthOfStayDays,
    patientAge,
  }: AdmissionDetailResult): AdmissionDetailResponse {
    return {
      ...toListItem(detail.admission, lengthOfStayDays),
      patient: {
        id: detail.patient.id,
        name: detail.patient.name,
        document: detail.patient.document,
        birthDate: detail.patient.birthDate.toISOString().slice(0, 10),
        age: patientAge,
        gender: detail.patient.gender,
      },
      attendingStaff: detail.attendingStaff,
      exams: detail.exams.map((exam) => ({
        id: exam.props.id,
        examType: exam.props.examType,
        requestedAt: exam.props.requestedAt.toISOString(),
        resultAt: exam.props.resultAt?.toISOString() ?? null,
        status: exam.props.status,
        resultValue: exam.props.resultValue,
        turnaroundHours: exam.turnaroundHours,
      })),
      vitalSigns: detail.vitalSigns.map((vital) => ({
        ...vital,
        measuredAt: vital.measuredAt.toISOString(),
      })),
    };
  },
};
