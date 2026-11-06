import { describe, it, expect } from 'vitest';
import {
  validateMeasurementDate,
  validateVariableValue,
  parseInputNumber,
  sanitizeDecimalInput,
  sanitizeTakes,
  sanitizeFinals,
  prepareUpdatedMeasurement,
} from './measurementEdit';
import { Measurement } from '../types';

describe('measurementEdit utilities', () => {
  describe('validateMeasurementDate', () => {
    const birthDate = '1995-05-15';
    const maxDate = '2026-11-06';

    it('acepta una fecha válida en el rango permitido', () => {
      const res = validateMeasurementDate('2026-10-10', birthDate, maxDate);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('acepta la fecha límite superior (hoy)', () => {
      const res = validateMeasurementDate(maxDate, birthDate, maxDate);
      expect(res.isValid).toBe(true);
    });

    it('acepta la fecha límite inferior (fecha de nacimiento)', () => {
      const res = validateMeasurementDate(birthDate, birthDate, maxDate);
      expect(res.isValid).toBe(true);
    });

    it('rechaza una fecha vacía', () => {
      const res = validateMeasurementDate('', birthDate, maxDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('requerida');
    });

    it('rechaza una fecha con formato incorrecto', () => {
      const res = validateMeasurementDate('15/05/2026', birthDate, maxDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('inválido');
    });

    it('rechaza una fecha anterior al nacimiento del paciente (caso de falla)', () => {
      const res = validateMeasurementDate('1990-01-01', birthDate, maxDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('no puede ser anterior al nacimiento');
    });

    it('rechaza una fecha futura posterior a la fecha máxima (caso de falla)', () => {
      const res = validateMeasurementDate('2027-01-01', birthDate, maxDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('no puede ser futura');
    });
  });

  describe('validateVariableValue', () => {
    it('acepta valores undefined o vacíos (variable no medida)', () => {
      expect(validateVariableValue(undefined, 80, 230, 'cm').isValid).toBe(true);
      expect(validateVariableValue(NaN, 80, 230, 'cm').isValid).toBe(true);
    });

    it('acepta valores dentro del rango', () => {
      expect(validateVariableValue(175, 80, 230, 'cm').isValid).toBe(true);
      expect(validateVariableValue(80, 80, 230, 'cm').isValid).toBe(true);
      expect(validateVariableValue(230, 80, 230, 'cm').isValid).toBe(true);
    });

    it('rechaza valores menores al mínimo ISAK (caso de falla)', () => {
      const res = validateVariableValue(50, 80, 230, 'cm');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Debe estar entre 80 y 230 cm');
    });

    it('rechaza valores mayores al máximo ISAK (caso de falla)', () => {
      const res = validateVariableValue(250, 80, 230, 'cm');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Debe estar entre 80 y 230 cm');
    });
  });

  describe('parseInputNumber', () => {
    it('parsea números con punto decimal', () => {
      expect(parseInputNumber('75.5')).toBe(75.5);
    });

    it('parsea números con coma decimal', () => {
      expect(parseInputNumber('75,5')).toBe(75.5);
    });

    it('ignora espacios alrededor', () => {
      expect(parseInputNumber('  180.2  ')).toBe(180.2);
    });

    it('retorna undefined para strings vacíos o solo espacios', () => {
      expect(parseInputNumber('')).toBeUndefined();
      expect(parseInputNumber('   ')).toBeUndefined();
    });

    it('retorna undefined para entradas alfabéticas inválidas', () => {
      expect(parseInputNumber('abc')).toBeUndefined();
    });
  });

  describe('sanitizeDecimalInput', () => {
    it('mantiene números enteros y decimales intactos', () => {
      expect(sanitizeDecimalInput('72')).toBe('72');
      expect(sanitizeDecimalInput('72.5')).toBe('72.5');
      expect(sanitizeDecimalInput('72,5')).toBe('72,5');
    });

    it('permite el separador decimal intermedio durante el tipeo reactivo', () => {
      expect(sanitizeDecimalInput('72.')).toBe('72.');
      expect(sanitizeDecimalInput('72,')).toBe('72,');
    });

    it('elimina caracteres no numéricos o letras pegadas accidentalmente (caso de falla)', () => {
      expect(sanitizeDecimalInput('abc')).toBe('');
      expect(sanitizeDecimalInput('72a.5b')).toBe('72.5');
      expect(sanitizeDecimalInput('  72.5  ')).toBe('72.5');
      expect(sanitizeDecimalInput('-12')).toBe('12');
    });

    it('descarta separadores decimales adicionales manteniendo el primero (caso borde)', () => {
      expect(sanitizeDecimalInput('72..5')).toBe('72.5');
      expect(sanitizeDecimalInput('72.,5')).toBe('72.5');
      expect(sanitizeDecimalInput('72,5,9')).toBe('72,59');
      expect(sanitizeDecimalInput('72.5.9')).toBe('72.59');
    });
  });

  describe('sanitizeTakes y sanitizeFinals', () => {
    it('elimina tomas vacías o no numéricas de cada variable', () => {
      const raw = {
        weight: [75.5, undefined, NaN],
        height: [180, 180.2],
        triceps: [undefined, undefined],
      };
      const clean = sanitizeTakes(raw as any);
      expect(clean.weight).toEqual([75.5]);
      expect(clean.height).toEqual([180, 180.2]);
      expect(clean.triceps).toBeUndefined();
    });

    it('elimina valores no positivos o NaN de finals', () => {
      const raw = {
        weight: 75.5,
        height: 0,
        triceps: NaN,
        biceps: 12.3,
      };
      const clean = sanitizeFinals(raw);
      expect(clean.weight).toBe(75.5);
      expect(clean.height).toBeUndefined();
      expect(clean.triceps).toBeUndefined();
      expect(clean.biceps).toBe(12.3);
    });
  });

  describe('prepareUpdatedMeasurement', () => {
    const original: Measurement = {
      id: 'meas-1',
      patientId: 'patient-1',
      date: '2026-10-01',
      protocol: 'ISAK_L1',
      takes: {
        weight: [70, 70],
        height: [175, 175],
      },
      finals: {
        weight: 70,
        height: 175,
      },
      notes: 'Nota anterior',
      formulaVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    it('actualiza fecha, notas y tomas recalculando finals según ISAK', () => {
      const updated = prepareUpdatedMeasurement({
        original,
        date: '2026-10-02',
        notes: 'Nota modificada',
        takes: {
          weight: [72, 73], // media = 72.5
          height: [176, 176, 177], // mediana = 176
        },
        now: 2000,
      });

      expect(updated.date).toBe('2026-10-02');
      expect(updated.notes).toBe('Nota modificada');
      expect(updated.updatedAt).toBe(2000);
      expect(updated.takes?.weight).toEqual([72, 73]);
      expect(updated.finals.weight).toBe(72.5);
      expect(updated.finals.height).toBe(176);
      expect(updated.createdAt).toBe(1000); // preserva createdAt
    });

    it('actualiza medición sin tomas (modo CSV) preservando finals directos', () => {
      const csvOriginal: Measurement = {
        ...original,
        takes: undefined,
        finals: { weight: 80, height: 182 },
      };

      const updated = prepareUpdatedMeasurement({
        original: csvOriginal,
        date: '2026-10-05',
        finals: { weight: 81.5, height: 182 },
        now: 3000,
      });

      expect(updated.date).toBe('2026-10-05');
      expect(updated.takes).toBeUndefined();
      expect(updated.finals.weight).toBe(81.5);
      expect(updated.finals.height).toBe(182);
      expect(updated.updatedAt).toBe(3000);
    });
  });
});

