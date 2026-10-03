export const ADMISSION_STATUSES = ['internado', 'alta', 'obito'] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

/**
 * Uma internação ocupa leito enquanto está com status "internado". O seed
 * tem altas com data de saída no futuro, então o status é a fonte de
 * verdade, e não a ausência de discharge_date.
 */
export const ACTIVE_ADMISSION_STATUS: AdmissionStatus = 'internado';
