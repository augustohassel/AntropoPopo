import { describe, it, expect } from 'vitest';
import {
  parseCsvToMatrix,
  normalizeDate,
  normalizeSex,
  generateCsvTemplate,
  parseMeasurementsCsv,
} from './csv';
import { Patient, Measurement } from '../types';

describe('CSV Utilities', () => {
  describe('parseCsvToMatrix', () => {
    it('parsea CSV estándar delimitado por comas', () => {
      const csv = 'Paciente,Sexo,Talla\nJuan,M,180\nAna,F,165';
      const matrix = parseCsvToMatrix(csv);
      expect(matrix).toEqual([
        ['Paciente', 'Sexo', 'Talla'],
        ['Juan', 'M', '180'],
        ['Ana', 'F', '165'],
      ]);
    });

    it('soporta delimitador punto y coma (;)', () => {
      const csv = 'Paciente;Sexo;Talla\nJuan;M;180\nAna;F;165';
      const matrix = parseCsvToMatrix(csv);
      expect(matrix).toEqual([
        ['Paciente', 'Sexo', 'Talla'],
        ['Juan', 'M', '180'],
        ['Ana', 'F', '165'],
      ]);
    });

    it('maneja comillas y comas internas según RFC 4180', () => {
      const csv = 'Paciente,Notas\n"Pérez, Juan","Observación con, comas y ""comillas"""';
      const matrix = parseCsvToMatrix(csv);
      expect(matrix).toEqual([
        ['Paciente', 'Notas'],
        ['Pérez, Juan', 'Observación con, comas y "comillas"'],
      ]);
    });

    it('ignora Byte Order Mark (BOM)', () => {
      const csv = '\uFEFFPaciente,Sexo\nCarlos,M';
      const matrix = parseCsvToMatrix(csv);
      expect(matrix).toEqual([
        ['Paciente', 'Sexo'],
        ['Carlos', 'M'],
      ]);
    });
  });

  describe('normalizeDate', () => {
    it('normaliza formato ISO YYYY-MM-DD', () => {
      expect(normalizeDate('2026-10-20')).toBe('2026-10-20');
      expect(normalizeDate('1995-01-05')).toBe('1995-01-05');
    });

    it('normaliza formato DD/MM/YYYY y DD-MM-YYYY', () => {
      expect(normalizeDate('20/10/2026')).toBe('2026-10-20');
      expect(normalizeDate('5/1/1995')).toBe('1995-01-05');
      expect(normalizeDate('15-08-2023')).toBe('2023-08-15');
    });

    it('retorna null para fechas inválidas', () => {
      expect(normalizeDate('')).toBeNull();
      expect(normalizeDate('invalido')).toBeNull();
      expect(normalizeDate('2026-13-40')).toBeNull();
    });
  });

  describe('normalizeSex', () => {
    it('normaliza valores masculinos y femeninos', () => {
      expect(normalizeSex('M')).toBe('M');
      expect(normalizeSex('Masc')).toBe('M');
      expect(normalizeSex('Masculino')).toBe('M');
      expect(normalizeSex('Hombre')).toBe('M');

      expect(normalizeSex('F')).toBe('F');
      expect(normalizeSex('Fem')).toBe('F');
      expect(normalizeSex('Femenino')).toBe('F');
      expect(normalizeSex('Mujer')).toBe('F');
    });

    it('retorna null si no coincide', () => {
      expect(normalizeSex('')).toBeNull();
      expect(normalizeSex('X')).toBeNull();
    });
  });

  describe('generateCsvTemplate', () => {
    it('genera plantilla genérica con dos filas de ejemplo', () => {
      const template = generateCsvTemplate();
      expect(template).toContain('Paciente,Sexo,Fecha de Nacimiento,Fecha de Medición');
      expect(template).toContain('Ejemplo Paciente Masculino');
      expect(template).toContain('Ejemplo Paciente Femenino');
    });

    it('genera plantilla contextualizada con los datos del paciente', () => {
      const patient: Patient = {
        id: 'pat-1',
        name: 'Martina Stoessel',
        sex: 'F',
        birthDate: '1997-03-21',
        isAthlete: true,
        primaryFatMethod: 'WITHERS',
        pin: '1234',
        createdAt: 1000,
        updatedAt: 1000,
      };

      const template = generateCsvTemplate(patient);
      expect(template).toContain('"Martina Stoessel",F,1997-03-21');
      expect(template).not.toContain('Ejemplo Paciente Masculino');
    });
  });

  describe('parseMeasurementsCsv', () => {
    const existingPatient: Patient = {
      id: 'pat-augusto',
      name: 'Augusto Hassel',
      sex: 'M',
      birthDate: '1990-05-10',
      isAthlete: true,
      primaryFatMethod: 'WITHERS',
      pin: '1234',
      createdAt: 1000,
      updatedAt: 1000,
    };

    const existingMeasurement: Measurement = {
      id: 'meas-1',
      patientId: 'pat-augusto',
      date: '2026-01-15',
      protocol: 'ISAK_L1',
      finals: { weight: 75, height: 180 },
      formulaVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    it('asocia medición a paciente existente y crea nueva medición', () => {
      const csv = `Paciente,Sexo,Fecha de Nacimiento,Fecha de Medición,Peso (kg),Talla (cm)
Augusto Hassel,M,1990-05-10,2026-02-15,76.5,180.2`;

      const result = parseMeasurementsCsv(csv, [existingPatient], [existingMeasurement]);

      expect(result.errors).toHaveLength(0);
      expect(result.newPatients).toHaveLength(0);
      expect(result.newMeasurements).toHaveLength(1);
      expect(result.matchedExistingPatientsCount).toBe(1);
      expect(result.newMeasurements[0].patientId).toBe('pat-augusto');
      expect(result.newMeasurements[0].date).toBe('2026-02-15');
      expect(result.newMeasurements[0].finals.weight).toBe(76.5);
      expect(result.newMeasurements[0].finals.height).toBe(180.2);
    });

    it('crea nuevo paciente automáticamente si no existe en la base', () => {
      const csv = `Paciente,Sexo,Fecha de Nacimiento,Fecha de Medición,Peso (kg),Talla (cm)
Lucía Gómez,F,1995-11-20,2026-03-10,58.0,164.0`;

      const result = parseMeasurementsCsv(csv, [existingPatient], [existingMeasurement]);

      expect(result.errors).toHaveLength(0);
      expect(result.newPatients).toHaveLength(1);
      expect(result.newPatients[0].name).toBe('Lucía Gómez');
      expect(result.newPatients[0].sex).toBe('F');
      expect(result.newPatients[0].birthDate).toBe('1995-11-20');
      expect(result.newPatients[0].pin).toBeDefined();

      expect(result.newMeasurements).toHaveLength(1);
      expect(result.newMeasurements[0].patientId).toBe(result.newPatients[0].id);
      expect(result.newMeasurements[0].date).toBe('2026-03-10');
    });

    it('deduplica mediciones para la misma fecha y paciente', () => {
      const csv = `Paciente,Sexo,Fecha de Nacimiento,Fecha de Medición,Peso (kg),Talla (cm)
Augusto Hassel,M,1990-05-10,2026-01-15,75.0,180.0
Augusto Hassel,M,1990-05-10,2026-04-20,77.0,180.0
Augusto Hassel,M,1990-05-10,2026-04-20,77.5,180.0`;

      const result = parseMeasurementsCsv(csv, [existingPatient], [existingMeasurement]);

      // 2026-01-15 ya existía en DB -> omitida
      // 2026-04-20 primera fila -> agregada
      // 2026-04-20 segunda fila -> duplicada en el mismo lote -> omitida
      expect(result.newMeasurements).toHaveLength(1);
      expect(result.newMeasurements[0].date).toBe('2026-04-20');
      expect(result.skippedRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('valida rangos numéricos ISAK y rechaza valores fuera de rango', () => {
      const csv = `Paciente,Sexo,Fecha de Nacimiento,Fecha de Medición,Peso (kg),Talla (cm)
Augusto Hassel,M,1990-05-10,2026-05-01,75.0,1.80`;

      // Talla en 1.80 está en metros en vez de cm (mínimo ISAK es 80 cm)
      const result = parseMeasurementsCsv(csv, [existingPatient], [existingMeasurement]);

      expect(result.newMeasurements).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Talla corporal');
      expect(result.errors[0].reason).toContain('fuera de rango permitido');
    });

    it('soporta separador decimal coma (,) y formato de fecha DD/MM/YYYY', () => {
      const csv = `Paciente;Sexo;Fecha de Nacimiento;Fecha de Medición;Peso (kg);Talla (cm);Tríceps (mm)
Augusto Hassel;M;10/05/1990;25/05/2026;75,4;180,5;8,2`;

      const result = parseMeasurementsCsv(csv, [existingPatient], [existingMeasurement]);

      expect(result.errors).toHaveLength(0);
      expect(result.newMeasurements).toHaveLength(1);
      expect(result.newMeasurements[0].date).toBe('2026-05-25');
      expect(result.newMeasurements[0].finals.weight).toBe(75.4);
      expect(result.newMeasurements[0].finals.height).toBe(180.5);
      expect(result.newMeasurements[0].finals.triceps).toBe(8.2);
    });
  });
});

