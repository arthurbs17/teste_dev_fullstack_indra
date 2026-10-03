export type Gender = 'M' | 'F';

export interface PatientDetails {
  id: number;
  name: string;
  document: string;
  birthDate: Date;
  gender: Gender;
}

/** Idade em anos completos na data de referência (datas em UTC). */
export function ageInYears(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    referenceDate.getUTCMonth() > birthDate.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birthDate.getUTCMonth() &&
      referenceDate.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}
