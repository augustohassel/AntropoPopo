import { Measurement, Patient, ProfessionalProfile } from '../types';

export const INITIAL_PROFESSIONAL: ProfessionalProfile = {
  name: 'Francis Holway',
  license: 'MN 4822',
  phone: '4822-9436',
  email: 'fholway@hotmail.com',
};

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'patient-augusto-sample',
    name: 'Augusto',
    sex: 'M',
    birthDate: '1988-06-18',
    isAthlete: true,
    primaryFatMethod: 'WITHERS',
    pin: '1234',
    notes: 'Paciente de referencia. Protocolo ISAK Nivel 1.',
    createdAt: new Date('2026-10-10').getTime(),
    updatedAt: new Date('2026-10-10').getTime(),
  },
];

export const INITIAL_MEASUREMENTS: Measurement[] = [
  {
    id: 'meas-augusto-1',
    patientId: 'patient-augusto-sample',
    date: '2026-10-10',
    protocol: 'ISAK_L1',
    takes: {
      weight: [82.5, 82.5],
      height: [182.0, 182.0],
      humerus: [7.5, 7.3],
      femur: [10.0, 10.0],
      armRelaxed: [35.5, 35.5],
      armFlexed: [37.0, 37.2],
      waist: [83.5, 83.6],
      hip: [96.0, 95.4],
      calfGirth: [37.5, 37.5],
      triceps: [5.0, 5.0],
      subscapular: [9.0, 9.0],
      biceps: [2.5, 3.0],
      iliacCrest: [13.0, 14.0],
      supraspinale: [10.0, 10.5],
      abdominal: [13.0, 12.5],
      thigh: [20.0, 21.5],
      calf: [9.0, 8.5],
    },
    finals: {
      weight: 82.5,
      height: 182.0,
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
    },
    notes: 'Informe inicial de Composición Corporal Nivel 1.',
    formulaVersion: 1,
    createdAt: new Date('2026-10-10').getTime(),
    updatedAt: new Date('2026-10-10').getTime(),
  },
];
