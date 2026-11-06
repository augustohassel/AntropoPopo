import { describe, it, expect } from 'vitest';
import {
  buildEvolutionData,
  calculateEvolutionComparison,
  calculateFinalValue,
  calculateRelativeDiffPct,
  computeResults,
  getVariablesNeedingThirdTake,
  needsThirdTake,
  siriEquation,
  sortMeasurementsChronological,
} from './calculator';
import { Finals, Measurement, Takes } from '../types';
import { VARIABLES } from '../domain/variables';

describe('Calculadora Antropométrica AntropoPopo', () => {
  it('calcula la tolerancia ISAK y decide si requiere 3ra toma', () => {
    // Pliegue tolerancia 5%
    expect(needsThirdTake([5.0, 5.2], 0.05)).toBe(false); // diff 3.92%
    expect(needsThirdTake([5.0, 5.5], 0.05)).toBe(true);  // diff 9.52%

    // Perímetro tolerancia 1%
    expect(needsThirdTake([35.5, 35.6], 0.01)).toBe(false); // diff 0.28%
    expect(needsThirdTake([35.0, 35.5], 0.01)).toBe(true);  // diff 1.42%

    // Porcentaje de diferencia relativa
    expect(calculateRelativeDiffPct([5.0])).toBeUndefined();
    expect(calculateRelativeDiffPct([5.0, 5.2])).toBe(3.92);
    expect(calculateRelativeDiffPct([5.0, 5.5])).toBe(9.52);
  });

  it('filtra correctamente las variables que requieren 3ra pasada ISAK', () => {
    const takes: Takes = {
      weight: [82.0], // Solo 1 toma -> no requiere 3ra
      height: [182.0, 182.2], // 0.11% <= 1% -> dentro de tolerancia
      waist: [80.0, 81.5], // 1.86% > 1% -> requiere 3ra pasada
      triceps: [10.0, 10.4], // 3.92% <= 5% -> dentro de tolerancia
      subscapular: [12.0, 13.0], // 8.0% > 5% -> requiere 3ra pasada
    };

    const thirdPassVars = getVariablesNeedingThirdTake(takes, VARIABLES);
    expect(thirdPassVars.map((v) => v.key)).toEqual(['waist', 'subscapular']);
  });

  it('calcula el valor final ISAK (media de 2 o mediana de 3)', () => {
    expect(calculateFinalValue([10])).toBe(10);
    expect(calculateFinalValue([10, 11])).toBe(10.5);
    expect(calculateFinalValue([10, 12, 11])).toBe(11);
    expect(calculateFinalValue([14, 10, 12])).toBe(12);
  });

  it('reproduce fielmente los datos reales del paciente Augusto con talla corregida a cm', () => {
    const finals: Finals = {
      weight: 82.5,
      height: 182.0, // 182 cm
      humerus: 7.4,
      femur: 10.0,
      armRelaxed: 35.5,
      armFlexed: 37.1,
      waist: 83.55,
      hip: 95.7,
      calfGirth: 37.5,
      triceps: 5.0,
      subscapular: 9.0,
      biceps: 2.75,
      iliacCrest: 13.5,
      supraspinale: 10.25,
      abdominal: 12.75,
      thigh: 20.75,
      calf: 8.75,
    };

    const patient = {
      sex: 'M' as const,
      birthDate: '1988-06-18',
      isAthlete: true,
      primaryFatMethod: 'WITHERS' as const,
    };

    const results = computeResults(finals, patient, '2026-10-10');

    // Edad decimal aprox 38.3 años
    expect(results.ageYears).toBeCloseTo(38.3, 0);

    // IMC saludable (no 249064.1)
    expect(results.bmi).toBe(24.9);

    // Sumas de pliegues
    expect(results.sum6).toBe(66.5);
    expect(results.sum7).toBe(69.25);
    expect(results.sum4DW).toBe(30.25);

    // Withers (atletas) coincide exacto con el Excel
    expect(results.withers).toBeDefined();
    expect(results.withers!.fatPct).toBe(12.1);
    expect(results.withers!.fatKg).toBe(10.0);
    expect(results.withers!.leanKg).toBe(72.5);

    // Índices T^2
    expect(results.withers!.fmi).toBe(3.0);
    expect(results.withers!.ffmi).toBe(21.9);

    // Área Muscular de Brazo (~92 cm²)
    expect(results.armMuscleArea).toBeCloseTo(91.6, 0);

    // Somatotipo de Heath & Carter corregido
    expect(results.somatotype).toBeDefined();
    const st = results.somatotype!;
    expect(st.hwr).toBeCloseTo(41.81, 1);
    expect(st.endo).toBeCloseTo(2.2, 0);
    expect(st.meso).toBeCloseTo(5.8, 0);
    expect(st.ecto).toBeCloseTo(2.0, 0);
    expect(st.category).toBe('Mesomorfo balanceado');

    // Coordenadas somatocarta
    expect(st.x).toBeCloseTo(-0.2, 1);
    expect(st.y).toBe(7.4);
  });

  it('calcula correctamente Withers para atletas mujeres', () => {
    // Ecuación de Withers (1987) F: D = 1.20953 - 0.08294 * log10(sum6)
    const sum6 = 60.0;
    const density = 1.20953 - 0.08294 * Math.log10(sum6);
    const fatPct = siriEquation(density);

    expect(density).toBeGreaterThan(1.0);
    expect(fatPct).toBeGreaterThan(10);
    expect(fatPct).toBeLessThan(25);
  });

  describe('Historial y Evolución Temporal de Mediciones', () => {
    const dummyPatient = {
      sex: 'M' as const,
      birthDate: '1990-01-01',
      isAthlete: true,
      primaryFatMethod: 'WITHERS' as const,
    };

    const m1: Measurement = {
      id: 'm-1',
      patientId: 'p-1',
      date: '2026-01-10',
      protocol: 'ISAK_L1',
      formulaVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
      finals: {
        weight: 85.0,
        height: 180.0,
        triceps: 10,
        subscapular: 12,
        biceps: 5,
        iliacCrest: 15,
        supraspinale: 12,
        abdominal: 18,
        thigh: 20,
        calf: 10,
      },
    };

    const m2: Measurement = {
      id: 'm-2',
      patientId: 'p-1',
      date: '2026-03-15',
      protocol: 'ISAK_L1',
      formulaVersion: 1,
      createdAt: 2000,
      updatedAt: 2000,
      finals: {
        weight: 82.0,
        height: 180.0,
        triceps: 8,
        subscapular: 10,
        biceps: 4,
        iliacCrest: 13,
        supraspinale: 10,
        abdominal: 15,
        thigh: 18,
        calf: 9,
      },
    };

    it('ordena mediciones cronológicamente y desempata por createdAt si coinciden en fecha', () => {
      const mSameDateEarlier: Measurement = {
        ...m1,
        id: 'm-same-1',
        date: '2026-03-15',
        createdAt: 1500,
      };
      const mSameDateLater: Measurement = {
        ...m2,
        id: 'm-same-2',
        date: '2026-03-15',
        createdAt: 2500,
      };

      const sorted = sortMeasurementsChronological([mSameDateLater, m1, mSameDateEarlier]);
      expect(sorted.map((m) => m.id)).toEqual(['m-1', 'm-same-1', 'm-same-2']);
    });

    it('construye la serie de evolución y maneja etiquetas temporales únicas', () => {
      const evoData = buildEvolutionData([m2, m1], dummyPatient);
      expect(evoData).toHaveLength(2);
      expect(evoData[0].date).toBe('2026-01-10');
      expect(evoData[0].peso).toBe(85.0);
      expect(evoData[1].date).toBe('2026-03-15');
      expect(evoData[1].peso).toBe(82.0);
      expect(evoData[0].suma6).toBeGreaterThan(evoData[1].suma6!);
    });

    it('calcula comparativa primera vs última consulta', () => {
      const evoData = buildEvolutionData([m1, m2], dummyPatient);
      const comparison = calculateEvolutionComparison(evoData);

      expect(comparison).toBeDefined();
      expect(comparison!.firstDate).toBe('2026-01-10');
      expect(comparison!.lastDate).toBe('2026-03-15');
      // Peso bajó de 85 a 82 kg -> diff = -3.0
      expect(comparison!.peso.first).toBe(85.0);
      expect(comparison!.peso.last).toBe(82.0);
      expect(comparison!.peso.diff).toBe(-3.0);

      // Con menos de 2 mediciones devuelve undefined
      expect(calculateEvolutionComparison([evoData[0]])).toBeUndefined();
    });
  });
});
