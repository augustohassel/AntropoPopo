import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
  Repeat,
} from 'lucide-react';
import { Patient, Takes, VariableKey } from '../../types';
import {
  VARIABLES,
  GROUP_LABELS,
} from '../../domain/variables';
import {
  calculateFinalValue,
  calculateRelativeDiffPct,
  computeFinalsFromTakes,
  getVariablesNeedingThirdTake,
  needsThirdTake,
} from '../../utils/calculator';
import { db } from '../../db';

interface NewMeasurementStepperProps {
  patient: Patient;
  onCancel: () => void;
  onSaved: (measurementId: string) => void;
}

type PassNumber = 1 | 2 | 3;

export const NewMeasurementStepper: React.FC<NewMeasurementStepperProps> = ({
  patient,
  onCancel,
  onSaved,
}) => {
  const [currentPass, setCurrentPass] = useState<PassNumber>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [takes, setTakes] = useState<Takes>({});
  const [isSaving, setIsSaving] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);

  // Variables que superaron la tolerancia ISAK entre Toma 1 y Toma 2
  const thirdTakeVars = getVariablesNeedingThirdTake(takes, VARIABLES);
  const pendingThirdTakeCount = thirdTakeVars.filter((v) => {
    const t3 = takes[v.key]?.[2];
    return typeof t3 !== 'number' || isNaN(t3) || t3 <= 0;
  }).length;

  // En Pasada 1 y 2 recorremos las 17 variables; en Pasada 3 solo las que requieren desempate
  const activeVariables = currentPass === 3 ? thirdTakeVars : VARIABLES;
  const safeIndex =
    activeVariables.length > 0
      ? Math.min(currentIndex, activeVariables.length - 1)
      : 0;
  const currentVar = activeVariables[safeIndex];
  const currentTakes = currentVar ? takes[currentVar.key] ?? [] : [];

  useEffect(() => {
    mainInputRef.current?.focus();
  }, [currentPass, safeIndex]);

  const handleTakeChange = (
    varKey: VariableKey,
    takeIndex: number,
    rawVal: string
  ) => {
    const val = rawVal === '' ? undefined : parseFloat(rawVal.replace(',', '.'));
    const existing = takes[varKey] ?? [];
    const nextArr = [...existing];

    if (val === undefined || isNaN(val)) {
      nextArr[takeIndex] = undefined as unknown as number;
    } else {
      nextArr[takeIndex] = val;
    }

    setTakes((prev) => ({
      ...prev,
      [varKey]: nextArr,
    }));
  };

  const handleSwitchPass = (pass: PassNumber) => {
    setCurrentPass(pass);
    setCurrentIndex(0);
  };

  const t1 = currentTakes[0];
  const t2 = currentTakes[1];
  const t3 = currentTakes[2];
  const activeTakeIndex = currentPass - 1;
  const activeTakeValue = currentTakes[activeTakeIndex];

  const diffPct = calculateRelativeDiffPct(currentTakes);
  const hasExceededTolerance =
    currentVar !== undefined &&
    needsThirdTake(currentTakes, currentVar.tolerance);

  const finalValue = calculateFinalValue(currentTakes);
  const validTakesCount = currentTakes.filter(
    (v) => typeof v === 'number' && !isNaN(v) && v > 0
  ).length;

  const finalMethodLabel =
    validTakesCount === 1
      ? '1 toma · valor único'
      : validTakesCount === 2
      ? '2 tomas · promedio'
      : validTakesCount >= 3
      ? '3 tomas · mediana'
      : 'Sin tomas';

  const handleNext = () => {
    if (safeIndex < activeVariables.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    } else if (currentPass === 2) {
      setCurrentPass(1);
      setCurrentIndex(VARIABLES.length - 1);
    } else if (currentPass === 3) {
      setCurrentPass(2);
      setCurrentIndex(VARIABLES.length - 1);
    }
  };

  const handleStartSecondPass = () => {
    setCurrentPass(2);
    setCurrentIndex(0);
  };

  const handleStartThirdPass = () => {
    setCurrentPass(3);
    setCurrentIndex(0);
  };

  const handleMainInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (safeIndex < activeVariables.length - 1) {
        handleNext();
      } else if (currentPass === 1) {
        handleStartSecondPass();
      } else if (currentPass === 2 && thirdTakeVars.length > 0) {
        handleStartThirdPass();
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finals = computeFinalsFromTakes(takes);
      const newId = `meas-${Date.now()}`;
      const now = Date.now();

      await db.measurements.add({
        id: newId,
        patientId: patient.id,
        date: measurementDate,
        protocol: 'ISAK_L1',
        takes,
        finals,
        notes: notes.trim(),
        formulaVersion: 1,
        createdAt: now,
        updatedAt: now,
      });

      onSaved(newId);
    } finally {
      setIsSaving(false);
    }
  };

  // Contadores de progreso por pasada y general
  const pass1Count = VARIABLES.filter((v) => {
    const val = takes[v.key]?.[0];
    return typeof val === 'number' && !isNaN(val) && val > 0;
  }).length;

  const pass2Count = VARIABLES.filter((v) => {
    const val = takes[v.key]?.[1];
    return typeof val === 'number' && !isNaN(val) && val > 0;
  }).length;

  const pass3Count = thirdTakeVars.filter((v) => {
    const val = takes[v.key]?.[2];
    return typeof val === 'number' && !isNaN(val) && val > 0;
  }).length;

  const filledCount = VARIABLES.filter((v) => {
    const arr = takes[v.key];
    return calculateFinalValue(arr) !== undefined;
  }).length;

  return (
    <div className="px-4 pt-4 pb-32 sm:px-6 sm:pt-6 sm:pb-32 space-y-4 max-w-lg mx-auto animate-fade-up">
      {/* Encabezado con datos del paciente */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">
            Nueva Medición ISAK Nivel 1
          </span>
          <h2 className="text-base font-bold text-white">{patient.name}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <input
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
                className="bg-transparent border-b border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-brand-500 py-0.5"
              />
            </span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>

      {/* Selector de Pasadas (Series ISAK) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
        <button
          type="button"
          onClick={() => handleSwitchPass(1)}
          className={`py-2 px-2 rounded-xl text-left transition-all ${
            currentPass === 1
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider opacity-80">
            1ra Pasada
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs font-bold">Toma 1</span>
            <span className="text-[11px] font-mono font-semibold">
              {pass1Count}/{VARIABLES.length}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchPass(2)}
          className={`py-2 px-2 rounded-xl text-left transition-all ${
            currentPass === 2
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider opacity-80">
            2da Pasada
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs font-bold">Toma 2</span>
            <span className="text-[11px] font-mono font-semibold">
              {pass2Count}/{VARIABLES.length}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchPass(3)}
          className={`py-2 px-2 rounded-xl text-left transition-all relative ${
            currentPass === 3
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : thirdTakeVars.length > 0
              ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider opacity-80">
            3ra Pasada
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs font-bold">Desempate</span>
            <span className="text-[11px] font-mono font-semibold">
              {thirdTakeVars.length > 0
                ? `${pass3Count}/${thirdTakeVars.length}`
                : '0'}
            </span>
          </div>
        </button>
      </div>

      {/* Progreso de la pasada activa */}
      {activeVariables.length > 0 && currentVar && (
        <div>
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 font-medium">
            <span>
              {currentPass === 3 ? 'Desempate' : `Pasada ${currentPass}`} ·{' '}
              {safeIndex + 1} de {activeVariables.length}:{' '}
              <strong className="text-white">{currentVar.label}</strong>
            </span>
            <span className="font-mono text-brand-400">
              {filledCount}/{VARIABLES.length} finales
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                currentPass === 3
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-brand-500 to-indigo-500'
              }`}
              style={{
                width: `${((safeIndex + 1) / activeVariables.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Contenido principal según si hay variables activas en la pasada */}
      {currentVar ? (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-800/80 inline-block">
                  {GROUP_LABELS[currentVar.group]}
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md inline-block ${
                    currentPass === 3
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                  }`}
                >
                  Toma {currentPass}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{currentVar.label}</h3>
              {currentVar.hint && (
                <p className="text-xs text-brand-300/90 mt-0.5">{currentVar.hint}</p>
              )}
            </div>
            <span className="text-sm font-bold font-mono text-slate-400 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
              {currentVar.unit}
            </span>
          </div>

          {/* Banner contextual en 3ra Pasada */}
          {currentPass === 3 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span>
                  Diferencia entre Toma 1 y Toma 2:{' '}
                  <strong className="font-mono">{diffPct ?? '—'}%</strong> (máx.
                  ISAK: {currentVar.tolerance * 100}%). Ingresá la{' '}
                  <strong>3ra toma</strong> para desempatar usando la mediana.
                </span>
              </div>
            </div>
          )}

          {/* Input principal de la toma correspondiente a la pasada activa */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>
                Registrar Toma {currentPass} ({currentVar.unit})
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Rango: {currentVar.min}–{currentVar.max} {currentVar.unit}
              </span>
            </label>
            <input
              ref={mainInputRef}
              type="number"
              step="any"
              value={activeTakeValue ?? ''}
              onChange={(e) =>
                handleTakeChange(currentVar.key, activeTakeIndex, e.target.value)
              }
              onKeyDown={handleMainInputKeyDown}
              placeholder="0.0"
              className={`w-full px-4 py-3.5 rounded-xl bg-slate-950 text-2xl font-bold font-mono text-center focus:outline-none focus:ring-2 transition-all ${
                currentPass === 3
                  ? 'border border-amber-500/50 text-amber-300 focus:border-amber-400 focus:ring-amber-400/40'
                  : 'border border-slate-700 text-white focus:border-brand-500 focus:ring-brand-500/40'
              }`}
            />
          </div>

          {/* Tomas previas y control de tolerancia en 2da Pasada */}
          {currentPass === 2 && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Toma 1 (1ra pasada):
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={t1 ?? ''}
                    onChange={(e) =>
                      handleTakeChange(currentVar.key, 0, e.target.value)
                    }
                    placeholder="—"
                    title="Editar Toma 1 si hubo un error de tipeo"
                    className="w-24 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-xs text-slate-500 font-mono">
                    {currentVar.unit}
                  </span>
                </div>

                {diffPct !== undefined && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg border ${
                      hasExceededTolerance
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    Δ {diffPct}% / {currentVar.tolerance * 100}%
                  </span>
                )}
              </div>

              {hasExceededTolerance ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Supera tolerancia ISAK ({currentVar.tolerance * 100}%). Se
                    solicitará <strong>Toma 3</strong> al pasar a la 3ra Pasada.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  {t2 !== undefined
                    ? 'Dentro de tolerancia ISAK. No requiere 3ra toma.'
                    : 'Si no repetís este sitio, avanzá con Siguiente y se conservará la Toma 1.'}
                </p>
              )}
            </div>
          )}

          {/* Tomas previas editables in-situ en 3ra Pasada */}
          {currentPass === 3 && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Toma 1 ({currentVar.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={t1 ?? ''}
                  onChange={(e) =>
                    handleTakeChange(currentVar.key, 0, e.target.value)
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Toma 2 ({currentVar.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={t2 ?? ''}
                  onChange={(e) =>
                    handleTakeChange(currentVar.key, 1, e.target.value)
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {/* Si está en 1ra pasada pero ya existen tomas posteriores para esta variable */}
          {currentPass === 1 && (t2 !== undefined || t3 !== undefined) && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span>Tomas posteriores registradas:</span>
              <span className="font-mono text-slate-300">
                {t2 !== undefined ? `T2: ${t2}` : ''}
                {t3 !== undefined ? ` · T3: ${t3}` : ''} {currentVar.unit}
              </span>
            </div>
          )}

          {/* Resumen del valor final computado */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  Valor Final Computado
                </span>
                <span className="text-[10px] text-slate-500">
                  {finalMethodLabel}
                </span>
              </div>
            </div>
            <span className="text-base font-bold font-mono text-brand-400">
              {finalValue !== undefined
                ? `${finalValue} ${currentVar.unit}`
                : '—'}
            </span>
          </div>
        </div>
      ) : (
        /* Estado vacío en 3ra Pasada cuando ninguna variable superó la tolerancia */
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Sin desempates requeridos en 3ra Pasada
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Todas las variables con 2 tomas se encuentran dentro del margen de
              tolerancia técnica ISAK (≤ 5% en pliegues y ≤ 1% en básicos,
              diámetros y perímetros).
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSwitchPass(2)}
              className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              Volver a 2da Pasada
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || filledCount === 0}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-40 shadow-lg shadow-emerald-500/25"
            >
              {isSaving ? 'Guardando...' : 'Finalizar y Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Selector rápido horizontal de las variables de la pasada activa */}
      {activeVariables.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Variables en{' '}
            {currentPass === 3
              ? '3ra Pasada (Desempate)'
              : `${currentPass === 1 ? '1ra' : '2da'} Pasada`}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
            {activeVariables.map((v, idx) => {
              const varTakes = takes[v.key] ?? [];
              const passVal = varTakes[currentPass - 1];
              const hasPassVal =
                typeof passVal === 'number' && !isNaN(passVal) && passVal > 0;
              const requiresThird = needsThirdTake(varTakes, v.tolerance);
              const hasThird =
                typeof varTakes[2] === 'number' &&
                !isNaN(varTakes[2]) &&
                varTakes[2] > 0;
              const isCurrent = idx === safeIndex;

              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all ${
                    isCurrent
                      ? currentPass === 3
                        ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow-md shadow-amber-500/30'
                        : 'bg-brand-500 text-slate-950 font-bold scale-105 shadow-md shadow-brand-500/30'
                      : requiresThird && !hasThird
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                      : hasPassVal
                      ? 'bg-slate-800 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {idx + 1}. {v.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notas generales de la consulta */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">
          Notas de la Consulta
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Comentarios sobre nutrición, entrenamiento o sensaciones del paciente..."
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Botones de navegación ergonómicos y transiciones de pasada */}
      {activeVariables.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPass === 1 && safeIndex === 0}
              className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {safeIndex < activeVariables.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-brand-500 text-slate-950 text-xs font-bold hover:bg-brand-400 shadow-lg shadow-brand-500/25 transition-all"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : currentPass === 1 ? (
              <button
                type="button"
                onClick={handleStartSecondPass}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-brand-500 text-slate-950 text-xs font-bold hover:bg-brand-400 shadow-lg shadow-brand-500/25 transition-all"
              >
                <Repeat className="w-4 h-4" />
                <span>Iniciar 2da Pasada</span>
              </button>
            ) : currentPass === 2 && thirdTakeVars.length > 0 ? (
              <button
                type="button"
                onClick={handleStartThirdPass}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/25 transition-all"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>
                  Ir a 3ra Pasada ({thirdTakeVars.length})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || filledCount === 0}
                className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-40 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Finalizar y Guardar'}</span>
              </button>
            )}
          </div>

          {/* Acción secundaria al final de la 1ra pasada: permitir guardar con 1 sola pasada */}
          {currentPass === 1 &&
            safeIndex === activeVariables.length - 1 &&
            filledCount > 0 && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isSaving
                    ? 'Guardando...'
                    : `Finalizar y Guardar con 1 sola pasada (${filledCount} variables)`}
                </span>
              </button>
            )}

          {/* Acción secundaria al final de la 2da pasada si hay desempates pero prefiere guardar directo */}
          {currentPass === 2 &&
            safeIndex === activeVariables.length - 1 &&
            thirdTakeVars.length > 0 && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isSaving
                    ? 'Guardando...'
                    : `Guardar ahora sin 3ra pasada (${pendingThirdTakeCount} desempate${
                        pendingThirdTakeCount === 1 ? '' : 's'
                      } pendiente${pendingThirdTakeCount === 1 ? '' : 's'})`}
                </span>
              </button>
            )}
        </div>
      )}

      {/* Atajo para guardar directamente si ya cargó al menos 10 variables y está en medio de una pasada */}
      {filledCount >= 10 &&
        activeVariables.length > 0 &&
        safeIndex < activeVariables.length - 1 && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline"
            >
              Guardar medición ahora ({filledCount} variables completadas)
            </button>
          </div>
        )}
    </div>
  );
};

