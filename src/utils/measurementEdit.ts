import { Finals, Measurement, Takes, VariableKey } from '../types';
import { computeFinalsFromTakes } from './calculator';

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValueValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida la fecha de la medición contra la fecha de nacimiento y fecha máxima (por defecto hoy)
 */
export function validateMeasurementDate(
  dateStr: string,
  birthDateStr: string,
  maxDateStr: string = new Date().toISOString().split('T')[0]
): DateValidationResult {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: false, error: 'La fecha de medición es requerida' };
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateStr)) {
    return { isValid: false, error: 'Formato de fecha inválido (debe ser AAAA-MM-DD)' };
  }

  if (dateStr < birthDateStr) {
    return {
      isValid: false,
      error: `La fecha de medición no puede ser anterior al nacimiento (${birthDateStr})`,
    };
  }

  if (dateStr > maxDateStr) {
    return {
      isValid: false,
      error: 'La fecha de medición no puede ser futura',
    };
  }

  return { isValid: true };
}

/**
 * Valida si un valor numérico ingresado se encuentra dentro del rango ISAK permitido
 */
export function validateVariableValue(
  value: number | undefined,
  min: number,
  max: number,
  unit: string
): ValueValidationResult {
  if (value === undefined || isNaN(value)) {
    return { isValid: true }; // Campo vacío es válido (variable no medida)
  }

  if (value < min || value > max) {
    return {
      isValid: false,
      error: `Debe estar entre ${min} y ${max} ${unit}`,
    };
  }

  return { isValid: true };
}

/**
 * Parsea un string a número admitiendo coma o punto decimal
 */
export function parseInputNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const normalized = trimmed.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? undefined : num;
}

/**
 * Limpia y normaliza un objeto de tomas crudas descartando valores inválidos o arrays vacíos
 */
export function sanitizeTakes(rawTakes: Partial<Record<VariableKey, (number | undefined)[]>>): Takes {
  const result: Takes = {};

  for (const [key, values] of Object.entries(rawTakes) as [VariableKey, (number | undefined)[]][]) {
    if (!values || !Array.isArray(values)) continue;
    const cleanNumbers = values.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
    if (cleanNumbers.length > 0) {
      result[key] = cleanNumbers;
    }
  }

  return result;
}

/**
 * Limpia y normaliza los valores finales descartando valores inválidos
 */
export function sanitizeFinals(rawFinals: Finals): Finals {
  const result: Finals = {};

  for (const [key, val] of Object.entries(rawFinals) as [VariableKey, number | undefined][]) {
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Construye el objeto Measurement actualizado garantizando recálculo de finals
 * y actualización de marca de tiempo
 */
export function prepareUpdatedMeasurement(params: {
  original: Measurement;
  date: string;
  notes?: string;
  takes?: Partial<Record<VariableKey, (number | undefined)[]>>;
  finals?: Finals;
  now?: number;
}): Measurement {
  const { original, date, notes, takes, finals, now = Date.now() } = params;

  const hasTakes = takes !== undefined && Object.keys(takes).length > 0;

  let cleanTakes: Takes | undefined = undefined;
  let resolvedFinals: Finals = {};

  if (hasTakes) {
    cleanTakes = sanitizeTakes(takes);
    resolvedFinals = computeFinalsFromTakes(cleanTakes);
  } else if (finals) {
    resolvedFinals = sanitizeFinals(finals);
  } else {
    resolvedFinals = { ...original.finals };
  }

  return {
    ...original,
    date,
    notes: notes?.trim() || '',
    takes: cleanTakes,
    finals: resolvedFinals,
    updatedAt: now,
  };
}
