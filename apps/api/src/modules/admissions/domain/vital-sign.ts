export interface VitalSign {
  id: number;
  measuredAt: Date;
  heartRate: number | null;
  systolicPressure: number | null;
  diastolicPressure: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
}
