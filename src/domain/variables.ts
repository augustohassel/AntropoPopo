import { VariableDef, VariableGroup, VariableKey } from '../types';

/** Tolerancias ISAK para decidir una 3ra toma */
const TOL_SKINFOLD = 0.05;
const TOL_OTHER = 0.01;

/**
 * Catálogo del protocolo "Nivel 1" (perfil restringido).
 * El ORDEN importa: define el orden del stepper de carga y la serialización compacta de los links.
 * Para agregar variables en el futuro, agregarlas AL FINAL para no romper links viejos.
 */
export const VARIABLES: VariableDef[] = [
  { key: 'weight', label: 'Peso bruto', group: 'basic', unit: 'kg', min: 10, max: 250, tolerance: TOL_OTHER },
  {
    key: 'height',
    label: 'Talla corporal',
    group: 'basic',
    unit: 'cm',
    min: 80,
    max: 230,
    tolerance: TOL_OTHER,
    hint: 'En centímetros (ej. 182,0)',
  },
  { key: 'humerus', label: 'Humeral (biepicondilar)', group: 'diameter', unit: 'cm', min: 3, max: 12, tolerance: TOL_OTHER },
  { key: 'femur', label: 'Femoral (biepicondilar)', group: 'diameter', unit: 'cm', min: 5, max: 15, tolerance: TOL_OTHER },
  { key: 'armRelaxed', label: 'Brazo relajado', group: 'girth', unit: 'cm', min: 10, max: 70, tolerance: TOL_OTHER },
  { key: 'armFlexed', label: 'Brazo flexionado en tensión', group: 'girth', unit: 'cm', min: 10, max: 75, tolerance: TOL_OTHER },
  { key: 'waist', label: 'Cintura (mínima)', group: 'girth', unit: 'cm', min: 40, max: 200, tolerance: TOL_OTHER },
  { key: 'hip', label: 'Cadera (máxima)', group: 'girth', unit: 'cm', min: 50, max: 200, tolerance: TOL_OTHER },
  { key: 'calfGirth', label: 'Pantorrilla (máxima)', group: 'girth', unit: 'cm', min: 15, max: 70, tolerance: TOL_OTHER },
  { key: 'triceps', label: 'Tríceps', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'subscapular', label: 'Subescapular', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'biceps', label: 'Bíceps', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'iliacCrest', label: 'Cresta ilíaca', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'supraspinale', label: 'Supraespinal', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'abdominal', label: 'Abdominal', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'thigh', label: 'Muslo medial', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
  { key: 'calf', label: 'Pantorrilla (máxima)', group: 'skinfold', unit: 'mm', min: 1, max: 80, tolerance: TOL_SKINFOLD },
];

export const VARIABLE_KEYS: VariableKey[] = VARIABLES.map((v) => v.key);

export const VARIABLE_BY_KEY: Record<VariableKey, VariableDef> = Object.fromEntries(
  VARIABLES.map((v) => [v.key, v]),
) as Record<VariableKey, VariableDef>;

export const GROUP_LABELS: Record<VariableGroup, string> = {
  basic: 'Datos básicos',
  diameter: 'Diámetros',
  girth: 'Perímetros',
  skinfold: 'Pliegues cutáneos',
};
