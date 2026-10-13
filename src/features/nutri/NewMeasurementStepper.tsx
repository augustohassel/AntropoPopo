import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { Patient, Takes } from '../../types';
import {
  VARIABLES,
  GROUP_LABELS,
} from '../../domain/variables';
import {
  calculateFinalValue,
  computeFinalsFromTakes,
  needsThirdTake,
} from '../../utils/calculator';
import { db } from '../../db';

interface NewMeasurementStepperProps {
  patient: Patient;
  onCancel: () => void;
  onSaved: (measurementId: string) => void;
}

export const NewMeasurementStepper: React.FC<NewMeasurementStepperProps> = ({
  patient,
  onCancel,
  onSaved,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [takes, setTakes] = useState<Takes>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentVar = VARIABLES[currentIndex];
  const currentTakes = takes[currentVar.key] ?? [];

  const handleTakeChange = (takeIndex: number, rawVal: string) => {
    const val = rawVal === '' ? undefined : parseFloat(rawVal.replace(',', '.'));
    const nextArr = [...currentTakes];

    if (val === undefined || isNaN(val)) {
      nextArr[takeIndex] = undefined as any;
    } else {
      nextArr[takeIndex] = val;
    }

    setTakes((prev) => ({
      ...prev,
      [currentVar.key]: nextArr,
    }));
  };

  const t1 = currentTakes[0];
  const t2 = currentTakes[1];
  const t3 = currentTakes[2];

  const hasExceededTolerance =
    typeof t1 === 'number' &&
    typeof t2 === 'number' &&
    needsThirdTake([t1, t2], currentVar.tolerance);

  const finalValue = calculateFinalValue(currentTakes);

  const handleNext = () => {
    if (currentIndex < VARIABLES.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
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

  // Cantidad de variables que ya tienen un valor final calculado
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

      {/* Progreso del stepper */}
      <div>
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 font-medium">
          <span>
            Variable {currentIndex + 1} de {VARIABLES.length}:{' '}
            <strong className="text-white">{currentVar.label}</strong>
          </span>
          <span className="font-mono text-brand-400">
            {filledCount}/{VARIABLES.length} cargadas
          </span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / VARIABLES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tarjeta principal de la variable actual */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-800/80 inline-block mb-1">
              {GROUP_LABELS[currentVar.group]}
            </span>
            <h3 className="text-xl font-bold text-white">{currentVar.label}</h3>
            {currentVar.hint && (
              <p className="text-xs text-brand-300/90 mt-0.5">{currentVar.hint}</p>
            )}
          </div>
          <span className="text-sm font-bold font-mono text-slate-400 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            {currentVar.unit}
          </span>
        </div>

        {/* Cajas de Tomas ISAK */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Toma 1 ({currentVar.unit})
            </label>
            <input
              type="number"
              step="any"
              value={t1 ?? ''}
              onChange={(e) => handleTakeChange(0, e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xl font-bold font-mono text-white text-center focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Toma 2 ({currentVar.unit})
            </label>
            <input
              type="number"
              step="any"
              value={t2 ?? ''}
              onChange={(e) => handleTakeChange(1, e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xl font-bold font-mono text-white text-center focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Alerta y Toma 3 automática si supera tolerancia ISAK */}
        {hasExceededTolerance && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fade-up">
            <div className="flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                La diferencia entre toma 1 y 2 supera la tolerancia ISAK ({currentVar.tolerance * 100}%).
                Se requiere una <strong>3ra toma</strong> para usar la mediana.
              </span>
            </div>

            <div className="max-w-[200px] mx-auto">
              <label className="block text-xs font-semibold text-amber-300 mb-1 text-center">
                Toma 3 de Control ({currentVar.unit})
              </label>
              <input
                type="number"
                step="any"
                value={t3 ?? ''}
                onChange={(e) => handleTakeChange(2, e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-lg font-bold font-mono text-amber-300 text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        )}

        {/* Resumen del valor final computado */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold text-slate-300">
              Valor Final Computado:
            </span>
          </div>
          <span className="text-base font-bold font-mono text-brand-400">
            {finalValue !== undefined ? `${finalValue} ${currentVar.unit}` : '—'}
          </span>
        </div>
      </div>

      {/* Selector rápido horizontal de las 17 variables */}
      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Layers className="w-3 h-3" /> Selector Rápido de Variables
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {VARIABLES.map((v, idx) => {
            const hasVal = calculateFinalValue(takes[v.key]) !== undefined;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={v.key}
                onClick={() => setCurrentIndex(idx)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-brand-500 text-slate-950 font-bold scale-105 shadow-md shadow-brand-500/30'
                    : hasVal
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

      {/* Botones de navegación ergonómicos */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        {currentIndex < VARIABLES.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-brand-500 text-slate-950 text-xs font-bold hover:bg-brand-400 shadow-lg shadow-brand-500/25 transition-all"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Finalizar y Guardar'}</span>
          </button>
        )}
      </div>

      {/* Botón flotante para guardar directamente si ya cargó lo esencial */}
      {filledCount >= 10 && currentIndex < VARIABLES.length - 1 && (
        <div className="text-center pt-2">
          <button
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
