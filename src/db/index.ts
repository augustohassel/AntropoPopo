import Dexie, { Table } from 'dexie';
import { BackupData, Measurement, Patient, ProfessionalProfile } from '../types';

export interface SettingEntry {
  key: string;
  value: any;
}

export class AntropoPopoDatabase extends Dexie {
  patients!: Table<Patient, string>;
  measurements!: Table<Measurement, string>;
  settings!: Table<SettingEntry, string>;

  constructor() {
    super('AntropoPopoDB');
    this.version(1).stores({
      patients: 'id, name, createdAt',
      measurements: 'id, patientId, date, createdAt',
      settings: 'key',
    });
  }
}

export const db = new AntropoPopoDatabase();

export const INITIALIZED_KEY = 'antropopopo_has_initialized_v1';
export const PROFESSIONAL_KEY = 'professional_profile';
export const APP_MODE_KEY = 'app_mode';

/**
 * Solicita almacenamiento persistente al navegador para prevenir desalojo
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}

/**
 * Inicializa la base de datos y limpia posibles datos semilla heredados
 */
export async function initializeDatabase(): Promise<void> {
  // Pedir almacenamiento persistente de forma no bloqueante
  requestPersistentStorage().catch(() => {});

  // Limpiar perfil profesional semilla heredado ('Francis Holway') si nunca fue personalizado
  const profRow = await db.settings.get(PROFESSIONAL_KEY);
  if (
    profRow?.value?.name === 'Francis Holway' &&
    profRow?.value?.email === 'fholway@hotmail.com'
  ) {
    await db.settings.delete(PROFESSIONAL_KEY);
  }

  // Limpiar atributo professional incrustado en el paciente de muestra si existía
  const samplePatient = await db.patients.get('patient-augusto-sample');
  if (samplePatient?.professional) {
    const { professional: _removed, ...rest } = samplePatient;
    await db.patients.put(rest);
  }
}

/**
 * Obtiene el perfil del profesional (o null si aún no fue configurado)
 */
export async function getProfessionalProfile(): Promise<ProfessionalProfile | null> {
  const row = await db.settings.get(PROFESSIONAL_KEY);
  const val = row?.value as ProfessionalProfile | undefined;
  if (!val || !val.name?.trim()) {
    return null;
  }
  return val;
}

/**
 * Guarda el perfil del profesional
 */
export async function saveProfessionalProfile(profile: ProfessionalProfile): Promise<void> {
  await db.settings.put({
    key: PROFESSIONAL_KEY,
    value: profile,
  });
}

/**
 * Exporta todos los datos a JSON
 */
export async function exportBackup(): Promise<string> {
  const patients = await db.patients.toArray();
  const measurements = await db.measurements.toArray();
  const professional = (await getProfessionalProfile()) ?? undefined;

  const backup: BackupData = {
    app: 'AntropoPopo',
    version: 1,
    exportedAt: new Date().toISOString(),
    professional,
    patients,
    measurements,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Exporta el historial de mediciones a CSV compatible con Excel
 */
export async function exportMeasurementsCSV(): Promise<string> {
  const patients = await db.patients.toArray();
  const measurements = await db.measurements.toArray();

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  const headers = [
    'Paciente',
    'Sexo',
    'Fecha de Nacimiento',
    'Fecha de Medición',
    'Peso (kg)',
    'Talla (cm)',
    'Humeral (cm)',
    'Femoral (cm)',
    'Brazo Relajado (cm)',
    'Brazo Flexionado (cm)',
    'Cintura (cm)',
    'Cadera (cm)',
    'Pantorrilla (cm)',
    'Tríceps (mm)',
    'Subescapular (mm)',
    'Bíceps (mm)',
    'Cresta Ilíaca (mm)',
    'Supraespinal (mm)',
    'Abdominal (mm)',
    'Muslo Medial (mm)',
    'Pantorrilla (mm)',
    'Notas',
  ];

  const rows = measurements.map((m) => {
    const p = patientMap.get(m.patientId);
    const f = m.finals;
    return [
      `"${p?.name || ''}"`,
      p?.sex || '',
      p?.birthDate || '',
      m.date || '',
      f.weight ?? '',
      f.height ?? '',
      f.humerus ?? '',
      f.femur ?? '',
      f.armRelaxed ?? '',
      f.armFlexed ?? '',
      f.waist ?? '',
      f.hip ?? '',
      f.calfGirth ?? '',
      f.triceps ?? '',
      f.subscapular ?? '',
      f.biceps ?? '',
      f.iliacCrest ?? '',
      f.supraspinale ?? '',
      f.abdominal ?? '',
      f.thigh ?? '',
      f.calf ?? '',
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Importa un backup JSON
 */
export async function importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data: BackupData = JSON.parse(jsonString);
    if (!data.patients || !data.measurements) {
      throw new Error('Formato de backup inválido.');
    }

    await db.transaction('rw', db.patients, db.measurements, db.settings, async () => {
      await db.patients.clear();
      await db.measurements.clear();
      await db.patients.bulkAdd(data.patients);
      await db.measurements.bulkAdd(data.measurements);
      if (data.professional) {
        await db.settings.put({
          key: PROFESSIONAL_KEY,
          value: data.professional,
        });
      }
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }

    return {
      success: true,
      message: `Se importaron ${data.patients.length} pacientes y ${data.measurements.length} mediciones.`,
    };
  } catch (err) {
    return {
      success: false,
      message: (err as Error).message || 'Error al procesar el archivo.',
    };
  }
}

/**
 * Restablece la base de datos a los datos de muestra iniciales
 */
export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', db.patients, db.measurements, db.settings, async () => {
    await db.patients.clear();
    await db.measurements.clear();
    await db.settings.clear();
  });
  if (typeof window !== 'undefined') {
    localStorage.removeItem(INITIALIZED_KEY);
  }
  await initializeDatabase();
}
