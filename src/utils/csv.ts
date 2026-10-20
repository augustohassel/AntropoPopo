import { Patient, Measurement, Sex, Finals } from '../types';
import { VARIABLES } from '../domain/variables';
import { generateRandomPin } from './crypto';

export const CSV_HEADERS = [
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
] as const;

export interface CsvRowError {
  row: number;
  patientName?: string;
  date?: string;
  reason: string;
}

export interface CsvSkippedRow {
  row: number;
  patientName: string;
  date: string;
  reason: string;
}

export interface CsvImportResult {
  newPatients: Patient[];
  newMeasurements: Measurement[];
  matchedExistingPatientsCount: number;
  skippedRows: CsvSkippedRow[];
  errors: CsvRowError[];
  totalRowsProcessed: number;
}

/**
 * Parsea un contenido CSV en una matriz bidimensional respetando RFC 4180
 * (comillas dobles, saltos de línea internos y delimitador automático `,` o `;`).
 */
export function parseCsvToMatrix(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ''); // Remover BOM si existe
  if (!clean.trim()) return [];

  // Detectar delimitador inspeccionando la primera línea
  const firstLine = clean.split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < clean.length && clean[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < clean.length && clean[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normaliza una fecha a YYYY-MM-DD.
 * Acepta YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY.
 */
export function normalizeDate(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;

  // Formato ISO: YYYY-MM-DD
  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(val);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // Formato común: DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(val);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

/**
 * Normaliza sexo a 'M' | 'F'
 */
export function normalizeSex(raw: string): Sex | null {
  const val = raw.trim().toUpperCase();
  if (val === 'M' || val.startsWith('MASC') || val === 'HOMBRE' || val === 'H') return 'M';
  if (val === 'F' || val.startsWith('FEM') || val === 'MUJER') return 'F';
  return null;
}

/**
 * Mapea nombres de cabeceras a claves de columna o variables ISAK
 */
function resolveHeaderIndexMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  const normalizeCol = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  headers.forEach((h, idx) => {
    const norm = normalizeCol(h);

    if (norm.includes('paciente') || norm === 'nombre') {
      map['patient'] = idx;
    } else if (norm.includes('sexo') || norm === 'genero') {
      map['sex'] = idx;
    } else if (norm.includes('nacimiento') || norm === 'fechanac') {
      map['birthDate'] = idx;
    } else if (norm.includes('medicion') || norm.includes('control') || norm === 'fecha') {
      map['date'] = idx;
    } else if (norm.includes('peso')) {
      map['weight'] = idx;
    } else if (norm.includes('talla') || norm.includes('altura') || norm.includes('estatura')) {
      map['height'] = idx;
    } else if (norm.includes('humeral') || norm.includes('humero')) {
      map['humerus'] = idx;
    } else if (norm.includes('femoral') || norm.includes('femur')) {
      map['femur'] = idx;
    } else if (norm.includes('brazorelajado')) {
      map['armRelaxed'] = idx;
    } else if (norm.includes('brazoflexionado') || norm.includes('brazotension')) {
      map['armFlexed'] = idx;
    } else if (norm.includes('cintura')) {
      map['waist'] = idx;
    } else if (norm.includes('cadera')) {
      map['hip'] = idx;
    } else if (norm.includes('pantorrilla') && (h.includes('(cm)') || norm.includes('perim') || norm.includes('girth'))) {
      map['calfGirth'] = idx;
    } else if (norm.includes('pantorrilla') && (h.includes('(mm)') || norm.includes('plieg') || norm.includes('skinfold'))) {
      map['calf'] = idx;
    } else if (norm.includes('triceps')) {
      map['triceps'] = idx;
    } else if (norm.includes('subescapular')) {
      map['subscapular'] = idx;
    } else if (norm.includes('biceps')) {
      map['biceps'] = idx;
    } else if (norm.includes('crestailiaca') || norm.includes('cresta')) {
      map['iliacCrest'] = idx;
    } else if (norm.includes('supraespinal') || norm.includes('suprailiaco')) {
      map['supraspinale'] = idx;
    } else if (norm.includes('abdominal')) {
      map['abdominal'] = idx;
    } else if (norm.includes('muslo') || norm.includes('muslomedial')) {
      map['thigh'] = idx;
    } else if (norm.includes('nota') || norm.includes('observacion')) {
      map['notes'] = idx;
    }
  });

  // Si hay 'pantorrilla' sin especificar unidad pero se usaron las cabeceras estándar en orden:
  if (map['calfGirth'] === undefined || map['calf'] === undefined) {
    const calfMatches: number[] = [];
    headers.forEach((h, idx) => {
      if (normalizeCol(h).includes('pantorrilla')) calfMatches.push(idx);
    });
    if (calfMatches.length >= 2) {
      if (map['calfGirth'] === undefined) map['calfGirth'] = calfMatches[0];
      if (map['calf'] === undefined) map['calf'] = calfMatches[1];
    }
  }

  return map;
}

/**
 * Parsea e importa mediciones y pacientes desde un CSV, deduplicando por paciente y fecha
 */
export function parseMeasurementsCsv(
  csvContent: string,
  existingPatients: Patient[],
  existingMeasurements: Measurement[]
): CsvImportResult {
  const matrix = parseCsvToMatrix(csvContent);

  if (matrix.length < 2) {
    return {
      newPatients: [],
      newMeasurements: [],
      matchedExistingPatientsCount: 0,
      skippedRows: [],
      errors: [{ row: 1, reason: 'El archivo está vacío o no contiene filas de datos.' }],
      totalRowsProcessed: 0,
    };
  }

  const headerRow = matrix[0];
  const colMap = resolveHeaderIndexMap(headerRow);

  // Validar cabeceras indispensables
  if (colMap['patient'] === undefined || colMap['date'] === undefined) {
    return {
      newPatients: [],
      newMeasurements: [],
      matchedExistingPatientsCount: 0,
      skippedRows: [],
      errors: [
        {
          row: 1,
          reason: 'Faltan columnas obligatorias: "Paciente" (o Nombre) y "Fecha de Medición" (o Fecha).',
        },
      ],
      totalRowsProcessed: 0,
    };
  }

  const newPatients: Patient[] = [];
  const newMeasurements: Measurement[] = [];
  const skippedRows: CsvSkippedRow[] = [];
  const errors: CsvRowError[] = [];

  // Mapas para búsqueda rápida e incremental
  const patientByName = new Map<string, Patient>();
  existingPatients.forEach((p) => {
    patientByName.set(p.name.trim().toLowerCase(), p);
  });

  // Conjunto de claves de deduplicación: `patientId_YYYY-MM-DD`
  const existingMeasurementKeys = new Set<string>();
  existingMeasurements.forEach((m) => {
    existingMeasurementKeys.add(`${m.patientId}_${m.date}`);
  });

  let matchedExistingCount = 0;
  const matchedExistingIds = new Set<string>();

  for (let rowIdx = 1; rowIdx < matrix.length; rowIdx++) {
    const row = matrix[rowIdx];
    const patientName = (row[colMap['patient']] || '').trim();
    const rawDate = (row[colMap['date']] || '').trim();

    // Fila vacía
    if (!patientName && !rawDate && row.every((c) => !c.trim())) {
      continue;
    }

    if (!patientName) {
      errors.push({
        row: rowIdx + 1,
        reason: 'El nombre del paciente está vacío.',
      });
      continue;
    }

    const normDate = normalizeDate(rawDate);
    if (!normDate) {
      errors.push({
        row: rowIdx + 1,
        patientName,
        reason: `Fecha de medición inválida ("${rawDate}"). Utilizá el formato YYYY-MM-DD o DD/MM/YYYY.`,
      });
      continue;
    }

    // Resolver paciente (existente o nuevo)
    const normNameKey = patientName.toLowerCase();
    let patient = patientByName.get(normNameKey);

    if (!patient) {
      // Crear nuevo paciente
      const rawSex = colMap['sex'] !== undefined ? row[colMap['sex']] : '';
      const rawBirth = colMap['birthDate'] !== undefined ? row[colMap['birthDate']] : '';
      const sex = normalizeSex(rawSex) || 'M';
      const birthDate = normalizeDate(rawBirth) || '1995-01-01';

      const now = Date.now();
      patient = {
        id: `patient-${now}-${Math.random().toString(36).slice(2, 7)}`,
        name: patientName,
        sex,
        birthDate,
        isAthlete: false,
        primaryFatMethod: 'DW',
        pin: generateRandomPin(),
        createdAt: now,
        updatedAt: now,
      };

      patientByName.set(normNameKey, patient);
      newPatients.push(patient);
    } else {
      if (!newPatients.some((p) => p.id === patient!.id)) {
        matchedExistingIds.add(patient.id);
      }
    }

    // Deduplicación por paciente y fecha
    const measKey = `${patient.id}_${normDate}`;
    if (existingMeasurementKeys.has(measKey)) {
      skippedRows.push({
        row: rowIdx + 1,
        patientName: patient.name,
        date: normDate,
        reason: `Ya existe una medición para el paciente "${patient.name}" en la fecha ${normDate}.`,
      });
      continue;
    }

    // Parsear variables ISAK
    const finals: Finals = {};
    let rowHasRangeError = false;

    for (const vDef of VARIABLES) {
      const colIndex = colMap[vDef.key];
      if (colIndex === undefined || colIndex >= row.length) continue;

      const rawVal = row[colIndex]?.trim();
      if (!rawVal) continue;

      // Soportar coma decimal (ej. 75,5 -> 75.5)
      const numVal = parseFloat(rawVal.replace(',', '.'));
      if (isNaN(numVal)) {
        errors.push({
          row: rowIdx + 1,
          patientName: patient.name,
          date: normDate,
          reason: `Valor no numérico para "${vDef.label}": "${rawVal}".`,
        });
        rowHasRangeError = true;
        break;
      }

      if (numVal < vDef.min || numVal > vDef.max) {
        errors.push({
          row: rowIdx + 1,
          patientName: patient.name,
          date: normDate,
          reason: `Valor de "${vDef.label}" (${numVal} ${vDef.unit}) fuera de rango permitido [${vDef.min} - ${vDef.max}].`,
        });
        rowHasRangeError = true;
        break;
      }

      finals[vDef.key] = numVal;
    }

    if (rowHasRangeError) {
      continue;
    }

    const notes = colMap['notes'] !== undefined ? row[colMap['notes']]?.trim() : undefined;

    const now = Date.now();
    const measurement: Measurement = {
      id: `meas-${now}-${Math.random().toString(36).slice(2, 7)}`,
      patientId: patient.id,
      date: normDate,
      protocol: 'ISAK_L1',
      finals,
      notes: notes || undefined,
      formulaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    newMeasurements.push(measurement);
    existingMeasurementKeys.add(measKey);
  }

  matchedExistingCount = matchedExistingIds.size;

  return {
    newPatients,
    newMeasurements,
    matchedExistingPatientsCount: matchedExistingCount,
    skippedRows,
    errors,
    totalRowsProcessed: matrix.length - 1,
  };
}

/**
 * Genera la plantilla CSV (genérica o contextualizada con los datos de un paciente)
 */
export function generateCsvTemplate(patient?: Patient): string {
  const header = CSV_HEADERS.join(',');
  const today = new Date().toISOString().split('T')[0];

  if (patient) {
    const row = [
      `"${patient.name.replace(/"/g, '""')}"`,
      patient.sex,
      patient.birthDate,
      today,
      '74.5',
      '178.0',
      '6.8',
      '9.5',
      '31.0',
      '33.5',
      '82.0',
      '98.0',
      '36.5',
      '8.0',
      '11.0',
      '5.0',
      '12.0',
      '9.0',
      '16.0',
      '13.0',
      '7.5',
      '"Control de ejemplo"',
    ].join(',');
    return `${header}\n${row}\n`;
  }

  const rowMasc = [
    '"Ejemplo Paciente Masculino"',
    'M',
    '1995-04-12',
    today,
    '75.0',
    '178.0',
    '6.8',
    '9.5',
    '31.0',
    '33.5',
    '82.0',
    '98.0',
    '36.5',
    '8.0',
    '11.0',
    '5.0',
    '12.0',
    '9.0',
    '16.0',
    '13.0',
    '7.5',
    '"Medición de referencia"',
  ].join(',');

  const rowFem = [
    '"Ejemplo Paciente Femenino"',
    'F',
    '1998-08-25',
    today,
    '60.0',
    '165.0',
    '6.2',
    '8.8',
    '26.5',
    '28.0',
    '68.0',
    '94.0',
    '34.0',
    '12.0',
    '10.0',
    '7.0',
    '14.0',
    '11.0',
    '18.0',
    '19.0',
    '11.0',
    '"Medición de referencia"',
  ].join(',');

  return `${header}\n${rowMasc}\n${rowFem}\n`;
}

/**
 * Descarga en el navegador un archivo CSV con BOM UTF-8 para compatibilidad total con Excel
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
