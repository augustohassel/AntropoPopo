import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pencil,
  Calendar,
  FileText,
  AlertTriangle,
  Check,
  Layers,
} from 'lucide-react';
import {
  Measurement,
  Patient,
  VariableGroup,
  VariableKey,
  Finals,
} from '../../types';
import {
  VARIABLES,
  GROUP_LABELS,
} from '../../domain/variables';
import {
  calculateFinalValue,
  needsThirdTake,
} from '../../utils/calculator';
import {
  parseInputNumber,
  prepareUpdatedMeasurement,
  sanitizeDecimalInput,
  validateMeasurementDate,
  validateVariableValue,
} from '../../utils/measurementEdit';
import { db } from '../../db';

interface EditMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurement: Measurement;
  patient: Patient;
  onSaved?: (updated: Measurement) => void;
}

type TabType = 'all' | VariableGroup;

export const EditMeasurementModal: React.FC<EditMeasurementModalProps> = ({
  isOpen,
  onClose,
  measurement,
  patient,
  onSaved,
}) => {
  const hasTakes = useMemo(() => {
    return (
      measurement.takes !== undefined &&
      Object.keys(measurement.takes).length > 0
    );
  }, [measurement.takes]);

  const [date, setDate] = useState(measurement.date);
  const [notes, setNotes] = useState(measurement.notes ?? '');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para tomas crudas [T1, T2, T3] en formato texto para tipeo natural
  const [takesState, setTakesState] = useState<
    Record<VariableKey, [string, string, string]>
  >(() => {
    const state: Partial<Record<VariableKey, [string, string, string]>> = {};
    for (const v of VARIABLES) {
      const existing = measurement.takes?.[v.key] ?? [];
      state[v.key] = [
        existing[0] !== undefined ? String(existing[0]) : '',
        existing[1] !== undefined ? String(existing[1]) : '',
        existing[2] !== undefined ? String(existing[2]) : '',
      ];
    }
    return state as Record<VariableKey, [string, string, string]>;
  });

  // Estado para valores finales directos (mediciones sin tomas, e.g. CSV)
  const [finalsState, setFinalsState] = useState<Record<VariableKey, string>>(
    () => {
      const state: Partial<Record<VariableKey, string>> = {};
      for (const v of VARIABLES) {
        const existing = measurement.finals[v.key];
        state[v.key] = existing !== undefined ? String(existing) : '';
      }
      return state as Record<VariableKey, string>;
    }
  );

  // Reinicializar estado si cambia la medición o al abrir
  useEffect(() => {
    if (isOpen) {
      setDate(measurement.date);
      setNotes(measurement.notes ?? '');
      setActiveTab('all');

      const nextTakes: Partial<Record<VariableKey, [string, string, string]>> = {};
      for (const v of VARIABLES) {
        const existing = measurement.takes?.[v.key] ?? [];
        nextTakes[v.key] = [
          existing[0] !== undefined ? String(existing[0]) : '',
          existing[1] !== undefined ? String(existing[1]) : '',
          existing[2] !== undefined ? String(existing[2]) : '',
        ];
      }
      setTakesState(nextTakes as Record<VariableKey, [string, string, string]>);

      const nextFinals: Partial<Record<VariableKey, string>> = {};
      for (const v of VARIABLES) {
        const existing = measurement.finals[v.key];
        nextFinals[v.key] = existing !== undefined ? String(existing) : '';
      }
      setFinalsState(nextFinals as Record<VariableKey, string>);
    }
  }, [isOpen, measurement]);

  if (!isOpen) return null;

  // Validación de fecha
  const todayStr = new Date().toISOString().split('T')[0];
  const dateValidation = validateMeasurementDate(date, patient.birthDate, todayStr);

  // Validación de variables y cálculo de errores
  const variableErrors: Partial<Record<VariableKey, string>> = {};
  const variableLiveFinals: Partial<Record<VariableKey, number | undefined>> = {};

  for (const v of VARIABLES) {
    if (hasTakes) {
      const [s1, s2, s3] = takesState[v.key];
      const n1 = parseInputNumber(s1);
      const n2 = parseInputNumber(s2);
      const n3 = parseInputNumber(s3);

      const val1 = validateVariableValue(n1, v.min, v.max, v.unit);
      const val2 = validateVariableValue(n2, v.min, v.max, v.unit);
      const val3 = validateVariableValue(n3, v.min, v.max, v.unit);

      if (!val1.isValid) variableErrors[v.key] = `Toma 1: ${val1.error}`;
      else if (!val2.isValid) variableErrors[v.key] = `Toma 2: ${val2.error}`;
      else if (!val3.isValid) variableErrors[v.key] = `Toma 3: ${val3.error}`;

      const activeNumbers = [n1, n2, n3].filter(
        (n): n is number => typeof n === 'number' && !isNaN(n) && n > 0
      );
      variableLiveFinals[v.key] = calculateFinalValue(activeNumbers);
    } else {
      const s = finalsState[v.key];
      const n = parseInputNumber(s);
      const val = validateVariableValue(n, v.min, v.max, v.unit);
      if (!val.isValid) {
        variableErrors[v.key] = val.error;
      }
      variableLiveFinals[v.key] = n;
    }
  }

  const hasErrors =
    !dateValidation.isValid || Object.values(variableErrors).some((err) => !!err);

  const handleTakeChange = (
    key: VariableKey,
    index: 0 | 1 | 2,
    value: string
  ) => {
    const sanitized = sanitizeDecimalInput(value);
    setTakesState((prev) => {
      const current = prev[key];
      const next: [string, string, string] = [...current];
      next[index] = sanitized;
      return {
        ...prev,
        [key]: next,
      };
    });
  };

  const handleFinalChange = (key: VariableKey, value: string) => {
    const sanitized = sanitizeDecimalInput(value);
    setFinalsState((prev) => ({
      ...prev,
      [key]: sanitized,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let updated: Measurement;

      if (hasTakes) {
        const numericTakes: Partial<Record<VariableKey, (number | undefined)[]>> = {};
        for (const v of VARIABLES) {
          const t = takesState[v.key];
          const n1 = parseInputNumber(t[0]);
          const n2 = parseInputNumber(t[1]);
          const n3 = parseInputNumber(t[2]);
          if (n1 !== undefined || n2 !== undefined || n3 !== undefined) {
            numericTakes[v.key] = [n1, n2, n3];
          }
        }

        updated = prepareUpdatedMeasurement({
          original: measurement,
          date,
          notes,
          takes: numericTakes,
        });
      } else {
        const numericFinals: Finals = {};
        for (const v of VARIABLES) {
          const val = parseInputNumber(finalsState[v.key]);
          if (val !== undefined) {
            numericFinals[v.key] = val;
          }
        }

        updated = prepareUpdatedMeasurement({
          original: measurement,
          date,
          notes,
          finals: numericFinals,
        });
      }

      await db.measurements.put(updated);
      onSaved?.(updated);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVariables =
    activeTab === 'all'
      ? VARIABLES
      : VARIABLES.filter((v) => v.group === activeTab);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera modal fija */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Editar Medición
              </h2>
              <p className="text-xs text-slate-400">
                {patient.name} · {hasTakes ? 'Con tomas ISAK' : 'Valores finales (CSV)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar sin guardar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Sección 1: Fecha y Notas */}
          <div className="glass-panel p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  <span>Fecha de Medición</span>
                </label>
                <input
                  type="date"
                  value={date}
                  max={todayStr}
                  min={patient.birthDate}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-white focus:outline-none transition-colors ${
                    dateValidation.isValid
                      ? 'border-slate-800 focus:border-brand-500'
                      : 'border-rose-500 focus:border-rose-500'
                  }`}
                />
                {!dateValidation.isValid && (
                  <span className="text-[10px] text-rose-400 font-medium block mt-1">
                    {dateValidation.error}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notas de la Consulta (Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones clínicas, cambios de dieta o entrenamiento..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Pestañas de Categoría ISAK */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-400" />
                <span>Variables Antropométricas</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {hasTakes
                  ? 'Editá tomas y el valor final se recalcula automáticamente'
                  : 'Editá los valores finales directamente'}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'Todas (17)' },
                  { id: 'basic', label: 'Básicos (2)' },
                  { id: 'diameter', label: 'Diámetros (2)' },
                  { id: 'girth', label: 'Perímetros (5)' },
                  { id: 'skinfold', label: 'Pliegues (8)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-brand-500 text-slate-950 shadow-sm shadow-brand-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sección 3: Lista de Variables */}
          <div className="space-y-2.5">
            {filteredVariables.map((v) => {
              const err = variableErrors[v.key];
              const liveFinal = variableLiveFinals[v.key];

              if (hasTakes) {
                const takesVals = takesState[v.key];
                const n1 = parseInputNumber(takesVals[0]);
                const n2 = parseInputNumber(takesVals[1]);
                const showThirdNotice =
                  n1 !== undefined &&
                  n2 !== undefined &&
                  needsThirdTake([n1, n2], v.tolerance) &&
                  parseInputNumber(takesVals[2]) === undefined;

                return (
                  <div
                    key={v.key}
                    className={`p-3 rounded-xl border transition-all ${
                      err
                        ? 'bg-rose-950/20 border-rose-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {v.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {v.unit}
                        </span>
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          ({GROUP_LABELS[v.group]})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-[11px] text-slate-500">Final:</span>
                        <span className="font-bold text-brand-300">
                          {liveFinal !== undefined ? `${liveFinal} ${v.unit}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Inputs de las 3 tomas */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Toma 1</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={takesVals[0]}
                          placeholder="—"
                          onChange={(e) =>
                            handleTakeChange(v.key, 0, e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Toma 2</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={takesVals[1]}
                          placeholder="—"
                          onChange={(e) =>
                            handleTakeChange(v.key, 1, e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Toma 3 (opc.)</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={takesVals[2]}
                          placeholder="—"
                          onChange={(e) =>
                            handleTakeChange(v.key, 2, e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Advertencias o errores específicos de la variable */}
                    {err && (
                      <span className="text-[10px] text-rose-400 font-medium block mt-1.5">
                        {err}
                      </span>
                    )}
                    {!err && showThirdNotice && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          Diferencia T1/T2 superó tolerancia ISAK ({v.tolerance * 100}%). Recomendada Toma 3.
                        </span>
                      </span>
                    )}
                  </div>
                );
              }

              // Mediciones sin tomas (modo CSV): input directo de valor final
              const finalVal = finalsState[v.key];
              return (
                <div
                  key={v.key}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    err
                      ? 'bg-rose-950/20 border-rose-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {v.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({v.unit})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Rango ISAK: {v.min} a {v.max} {v.unit}
                    </span>
                    {err && (
                      <span className="text-[10px] text-rose-400 font-medium block">
                        {err}
                      </span>
                    )}
                  </div>

                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={finalVal}
                      placeholder="—"
                      onChange={(e) => handleFinalChange(v.key, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono text-right focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie modal fijo con acciones */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 space-y-3">
          {hasErrors && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Corregí los errores marcados antes de guardar.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={hasErrors || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs hover:bg-brand-400 shadow-md shadow-brand-500/20 disabled:opacity-40 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
