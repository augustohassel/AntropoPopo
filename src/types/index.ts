// ─────────────────────────────────────────────────────────────
// Tipos de dominio de AntropoPopo
// ─────────────────────────────────────────────────────────────

export type Sex = 'M' | 'F';

/** Modo de uso de la app en este dispositivo */
export type AppMode = 'nutri' | 'patient';

/** Método de estimación de % graso que ve el paciente */
export type FatMethod = 'DW' | 'WITHERS';

export type VariableGroup = 'basic' | 'diameter' | 'girth' | 'skinfold';

export type VariableKey =
  | 'weight'
  | 'height'
  | 'humerus'
  | 'femur'
  | 'armRelaxed'
  | 'armFlexed'
  | 'waist'
  | 'hip'
  | 'calfGirth'
  | 'triceps'
  | 'subscapular'
  | 'biceps'
  | 'iliacCrest'
  | 'supraspinale'
  | 'abdominal'
  | 'thigh'
  | 'calf';

export interface VariableDef {
  key: VariableKey;
  label: string;
  group: VariableGroup;
  unit: 'kg' | 'cm' | 'mm';
  /** Rango válido; evita errores de unidad como cargar la talla en metros */
  min: number;
  max: number;
  /** Diferencia relativa máxima entre 2 tomas antes de pedir una 3ra (ISAK) */
  tolerance: number;
  hint?: string;
}

export type Takes = Partial<Record<VariableKey, number[]>>;
export type Finals = Partial<Record<VariableKey, number>>;

export interface ProfessionalProfile {
  name: string;
  license?: string;
  phone?: string;
  email?: string;
}

export interface Patient {
  /** UUID generado en el dispositivo del nutricionista; se conserva al compartir */
  id: string;
  name: string;
  sex: Sex;
  /** YYYY-MM-DD */
  birthDate: string;
  isAthlete: boolean;
  primaryFatMethod: FatMethod;
  /** PIN para cifrar los links compartidos (lado nutri) o recordado (lado paciente) */
  pin: string;
  notes?: string;
  /** Sólo en modo paciente: quién lo midió */
  professional?: ProfessionalProfile;
  createdAt: number;
  updatedAt: number;
}

export interface Measurement {
  id: string;
  patientId: string;
  /** YYYY-MM-DD */
  date: string;
  protocol: 'ISAK_L1';
  /** Tomas crudas (sólo existen del lado del nutricionista) */
  takes?: Takes;
  /** Valor final por variable (media de 2 / mediana de 3) */
  finals: Finals;
  notes?: string;
  formulaVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface FatResult {
  method: FatMethod;
  density: number;
  fatPct: number;
  fatKg: number;
  leanKg: number;
  /** Fat Mass Index kg/m² */
  fmi: number;
  /** Fat-Free Mass Index kg/m² */
  ffmi: number;
}

export interface Somatotype {
  endo: number;
  meso: number;
  ecto: number;
  /** X = ecto − endo */
  x: number;
  /** Y = 2·meso − (endo + ecto) */
  y: number;
  hwr: number;
  category: string;
}

export interface MeasurementResults {
  ageYears: number;
  weight?: number;
  height?: number;
  bmi?: number;
  waistHipRatio?: number;
  sum6?: number;
  sum7?: number;
  sum4DW?: number;
  dw?: FatResult;
  withers?: FatResult;
  primaryFat?: FatResult;
  /** Área muscular de brazo (cm²) */
  armMuscleArea?: number;
  correctedArm?: number;
  correctedCalf?: number;
  somatotype?: Somatotype;
  warnings: string[];
}

export interface BackupData {
  app: 'AntropoPopo';
  version: 1;
  exportedAt: string;
  professional?: ProfessionalProfile;
  patients: Patient[];
  measurements: Measurement[];
}
