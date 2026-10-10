import {
  FatMethod,
  FatResult,
  Finals,
  MeasurementResults,
  Sex,
  Somatotype,
  Takes,
  VariableKey,
} from '../types';

/**
 * Determina si dos tomas exceden la tolerancia ISAK y requieren una tercera
 */
export function needsThirdTake(takes: number[] = [], tolerance: number = 0.05): boolean {
  if (takes.length < 2) return false;
  const [t1, t2] = takes;
  if (t1 <= 0 || t2 <= 0) return false;
  const diff = Math.abs(t1 - t2);
  const mean = (t1 + t2) / 2;
  return diff / mean > tolerance;
}

/**
 * Calcula el valor final según protocolo ISAK:
 * - 1 toma: esa toma
 * - 2 tomas: promedio
 * - 3 tomas: mediana (valor central ordenado)
 */
export function calculateFinalValue(takes: number[] = []): number | undefined {
  const valid = takes.filter((v) => typeof v === 'number' && !isNaN(v) && v > 0);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  if (valid.length === 2) return round((valid[0] + valid[1]) / 2, 3);
  // Mediana para 3 o más tomas
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return round((sorted[mid - 1] + sorted[mid]) / 2, 3);
}

/**
 * Resuelve todos los valores finales a partir de un mapa de tomas
 */
export function computeFinalsFromTakes(takes: Takes): Finals {
  const finals: Finals = {};
  for (const [key, values] of Object.entries(takes) as [VariableKey, number[]][]) {
    const finalVal = calculateFinalValue(values);
    if (finalVal !== undefined) {
      finals[key] = finalVal;
    }
  }
  return finals;
}

/**
 * Redondeo con precisión decimal fija
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calcula la edad decimal exacta a partir de fecha de nacimiento y fecha de medición
 */
export function calculateDecimalAge(birthDateStr: string, measurementDateStr: string): number {
  const birth = new Date(birthDateStr);
  const meas = new Date(measurementDateStr);
  const diffMs = meas.getTime() - birth.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.2425);
  return round(Math.max(0, years), 1);
}

/**
 * Coeficientes Durnin & Womersley (1974) por sexo y grupo etario
 */
function getDWCoefficients(sex: Sex, age: number): { c: number; m: number } {
  if (sex === 'M') {
    if (age < 17) return { c: 1.1533, m: 0.0643 };
    if (age < 20) return { c: 1.162, m: 0.063 };
    if (age < 30) return { c: 1.1631, m: 0.0632 };
    if (age < 40) return { c: 1.1422, m: 0.0544 };
    if (age < 50) return { c: 1.162, m: 0.07 };
    return { c: 1.1715, m: 0.0779 };
  } else {
    if (age < 17) return { c: 1.1369, m: 0.0598 };
    if (age < 20) return { c: 1.1549, m: 0.0678 };
    if (age < 30) return { c: 1.1599, m: 0.0717 };
    if (age < 40) return { c: 1.1423, m: 0.0632 };
    if (age < 50) return { c: 1.1333, m: 0.0612 };
    return { c: 1.1339, m: 0.0645 };
  }
}

/**
 * Siri (1961): % Grasa = (4.95 / D - 4.50) * 100
 */
export function siriEquation(density: number): number {
  if (density <= 0) return 0;
  const pct = (4.95 / density - 4.5) * 100;
  return round(Math.max(0, Math.min(100, pct)), 1);
}

/**
 * Estima composición corporal a partir de densidad y peso
 */
function buildFatResult(
  method: FatMethod,
  density: number,
  weight: number,
  heightM: number
): FatResult {
  const fatPct = siriEquation(density);
  const fatKg = round((weight * fatPct) / 100, 1);
  const leanKg = round(Math.max(0, weight - fatKg), 1);
  const heightM2 = heightM > 0 ? heightM * heightM : 1;
  const fmi = round(fatKg / heightM2, 1);
  const ffmi = round(leanKg / heightM2, 1);

  return {
    method,
    density: round(density, 6),
    fatPct,
    fatKg,
    leanKg,
    fmi,
    ffmi,
  };
}

/**
 * Somatotipo de Heath & Carter (1990)
 */
export function calculateSomatotype(
  heightCm: number,
  weightKg: number,
  humerus: number,
  femur: number,
  armFlexed: number,
  calfGirth: number,
  triceps: number,
  subscapular: number,
  supraspinale: number,
  calfSkinfold: number
): Somatotype {
  // Raíz cúbica del peso
  const cubeRootWeight = Math.cbrt(weightKg);
  const hwr = cubeRootWeight > 0 ? heightCm / cubeRootWeight : 0;

  // 1. Endomorfia (ajustada a talla estandarizada 170.18 cm)
  const sum3Skinfolds = triceps + subscapular + supraspinale;
  const correctedSum = heightCm > 0 ? sum3Skinfolds * (170.18 / heightCm) : sum3Skinfolds;
  const endoRaw =
    -0.7182 +
    0.1451 * correctedSum -
    0.00068 * Math.pow(correctedSum, 2) +
    0.0000014 * Math.pow(correctedSum, 3);
  const endo = round(Math.max(0.1, endoRaw), 1);

  // 2. Mesomorfia
  // Perímetros corregidos por pliegue (ambos en cm: mm / 10)
  const corrArm = armFlexed - triceps / 10;
  const corrCalf = calfGirth - calfSkinfold / 10;
  const mesoRaw =
    0.858 * humerus +
    0.601 * femur +
    0.188 * corrArm +
    0.161 * corrCalf -
    0.131 * heightCm +
    4.5;
  const meso = round(Math.max(0.1, mesoRaw), 1);

  // 3. Ectomorfia
  let ectoRaw: number;
  if (hwr >= 40.75) {
    ectoRaw = 0.732 * hwr - 28.58;
  } else if (hwr >= 38.25) {
    ectoRaw = 0.463 * hwr - 17.63;
  } else {
    ectoRaw = 0.1;
  }
  const ecto = round(Math.max(0.1, ectoRaw), 1);

  // Coordenadas somatocarta
  const x = round(ecto - endo, 2);
  const y = round(2 * meso - (endo + ecto), 2);

  // Clasificación Carter & Heath
  const category = classifySomatotype(endo, meso, ecto);

  return {
    endo,
    meso,
    ecto,
    x,
    y,
    hwr: round(hwr, 2),
    category,
  };
}

/**
 * Clasifica el somatotipo según las 13 categorías de Carter & Heath
 */
export function classifySomatotype(endo: number, meso: number, ecto: number): string {
  if (meso > endo && meso > ecto) {
    if (Math.abs(endo - ecto) <= 0.5) return 'Mesomorfo balanceado';
    if (endo > ecto) return 'Endo-mesomorfo';
    return 'Ecto-mesomorfo';
  }
  if (endo > meso && endo > ecto) {
    if (Math.abs(meso - ecto) <= 0.5) return 'Endomorfo balanceado';
    if (meso > ecto) return 'Meso-endomorfo';
    return 'Ecto-endomorfo';
  }
  if (ecto > endo && ecto > meso) {
    if (Math.abs(endo - meso) <= 0.5) return 'Ectomorfo balanceado';
    if (meso > endo) return 'Meso-ectomorfo';
    return 'Endo-ectomorfo';
  }
  return 'Central';
}

/**
 * Motor central de cálculo de resultados antropométricos
 */
export function computeResults(
  finals: Finals,
  patient: { sex: Sex; birthDate: string; isAthlete?: boolean; primaryFatMethod?: FatMethod },
  measurementDate: string
): MeasurementResults {
  const warnings: string[] = [];

  const weight = finals.weight;
  const height = finals.height; // en cm
  const ageYears = calculateDecimalAge(patient.birthDate, measurementDate);

  // Validaciones
  if (!height) warnings.push('Falta talla corporal');
  if (!weight) warnings.push('Falta peso corporal');
  if (height && height < 50) {
    warnings.push('La talla parece estar en metros en lugar de centímetros (menor a 50 cm)');
  }

  const heightM = height && height > 0 ? height / 100 : 0;

  // IMC
  const bmi =
    weight && heightM > 0 ? round(weight / (heightM * heightM), 1) : undefined;

  // Índice Cintura / Cadera
  const waistHipRatio =
    finals.waist && finals.hip && finals.hip > 0
      ? round(finals.waist / finals.hip, 2)
      : undefined;

  // Sumas de pliegues
  const { triceps, subscapular, biceps, iliacCrest, supraspinale, abdominal, thigh, calf } =
    finals;

  let sum6: number | undefined;
  if (
    triceps !== undefined &&
    subscapular !== undefined &&
    supraspinale !== undefined &&
    abdominal !== undefined &&
    thigh !== undefined &&
    calf !== undefined
  ) {
    sum6 = round(triceps + subscapular + supraspinale + abdominal + thigh + calf, 2);
  }

  let sum7: number | undefined;
  if (sum6 !== undefined && biceps !== undefined) {
    sum7 = round(sum6 + biceps, 2);
  }

  let sum4DW: number | undefined;
  if (
    triceps !== undefined &&
    biceps !== undefined &&
    subscapular !== undefined &&
    iliacCrest !== undefined
  ) {
    sum4DW = round(triceps + biceps + subscapular + iliacCrest, 2);
  }

  // Composición Corporal: Durnin & Womersley (1974)
  let dw: FatResult | undefined;
  if (sum4DW !== undefined && weight && heightM > 0 && sum4DW > 0) {
    const logSum = Math.log10(sum4DW);
    const { c, m } = getDWCoefficients(patient.sex, ageYears);
    const densityDW = c - m * logSum;
    dw = buildFatResult('DW', densityDW, weight, heightM);
  }

  // Composición Corporal: Withers et al. (1987)
  let withers: FatResult | undefined;
  if (weight && heightM > 0) {
    if (patient.sex === 'M' && sum7 !== undefined) {
      // Withers Masculino: D = 1.0988 - 0.0004 * sum7
      const densityWithersM = 1.0988 - 0.0004 * sum7;
      withers = buildFatResult('WITHERS', densityWithersM, weight, heightM);
    } else if (patient.sex === 'F' && sum6 !== undefined && sum6 > 0) {
      // Withers Femenino: D = 1.20953 - 0.08294 * log10(sum6)
      const densityWithersF = 1.20953 - 0.08294 * Math.log10(sum6);
      withers = buildFatResult('WITHERS', densityWithersF, weight, heightM);
    }
  }

  // Método de grasa primario (preferido para el paciente)
  const preferredMethod: FatMethod =
    patient.primaryFatMethod ?? (patient.isAthlete ? 'WITHERS' : 'DW');
  const primaryFat = preferredMethod === 'WITHERS' ? (withers ?? dw) : (dw ?? withers);

  // Área Muscular de Brazo (cm²)
  let armMuscleArea: number | undefined;
  let correctedArm: number | undefined;
  if (finals.armRelaxed !== undefined && triceps !== undefined) {
    // AMB = (C_arm - pi * S_triceps / 10)^2 / (4 * pi)
    const armCm = finals.armRelaxed;
    const tricepsCm = triceps / 10;
    const netGirth = armCm - Math.PI * tricepsCm;
    if (netGirth > 0) {
      armMuscleArea = round(Math.pow(netGirth, 2) / (4 * Math.PI), 1);
    }
  }

  if (finals.armFlexed !== undefined && triceps !== undefined) {
    correctedArm = round(finals.armFlexed - triceps / 10, 1);
  }

  let correctedCalf: number | undefined;
  if (finals.calfGirth !== undefined && calf !== undefined) {
    correctedCalf = round(finals.calfGirth - calf / 10, 1);
  }

  // Somatotipo de Heath & Carter
  let somatotype: Somatotype | undefined;
  if (
    height &&
    weight &&
    finals.humerus !== undefined &&
    finals.femur !== undefined &&
    finals.armFlexed !== undefined &&
    finals.calfGirth !== undefined &&
    triceps !== undefined &&
    subscapular !== undefined &&
    supraspinale !== undefined &&
    calf !== undefined
  ) {
    somatotype = calculateSomatotype(
      height,
      weight,
      finals.humerus,
      finals.femur,
      finals.armFlexed,
      finals.calfGirth,
      triceps,
      subscapular,
      supraspinale,
      calf
    );
  }

  return {
    ageYears,
    weight,
    height,
    bmi,
    waistHipRatio,
    sum6,
    sum7,
    sum4DW,
    dw,
    withers,
    primaryFat,
    armMuscleArea,
    correctedArm,
    correctedCalf,
    somatotype,
    warnings,
  };
}
