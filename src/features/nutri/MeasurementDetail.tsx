import React, { useState } from 'react';
import {
  ChevronLeft,
  Share2,
  Calendar,
  Weight,
  Flame,
  Trash2,
  Compass,
  Eye,
} from 'lucide-react';
import { Measurement, Patient, ProfessionalProfile } from '../../types';
import { computeResults } from '../../utils/calculator';
import { Somatochart } from '../../components/common/Somatochart';
import { ShareModal } from './ShareModal';
import { VARIABLES } from '../../domain/variables';
import { db } from '../../db';

interface MeasurementDetailProps {
  measurement: Measurement;
  patient: Patient;
  allPatientMeasurements: Measurement[];
  professional?: ProfessionalProfile;
  onBack: () => void;
  onDeleted: () => void;
  onPreviewAsPatient: () => void;
}

export const MeasurementDetail: React.FC<MeasurementDetailProps> = ({
  measurement,
  patient,
  allPatientMeasurements,
  professional,
  onBack,
  onDeleted,
  onPreviewAsPatient,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const results = computeResults(measurement.finals, patient, measurement.date);

  // Somatotipos previos para la trayectoria en la somatocarta
  const previousSomatotypes = allPatientMeasurements
    .filter((m) => m.id !== measurement.id && new Date(m.date) < new Date(measurement.date))
    .map((m) => computeResults(m.finals, patient, m.date).somatotype)
    .filter(Boolean) as any[];

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que deseás eliminar esta medición?')) {
      setIsDeleting(true);
      try {
        await db.measurements.delete(measurement.id);
        onDeleted();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="px-4 pt-4 pb-32 sm:px-6 sm:pt-6 sm:pb-32 space-y-4 max-w-lg mx-auto animate-fade-up">
      {/* Barra superior de navegación */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPreviewAsPatient}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs hover:bg-slate-700 hover:text-white transition-all"
            title="Previsualizar cómo verá el informe el paciente"
          >
            <Eye className="w-3.5 h-3.5 text-brand-400" />
            <span>Ver como paciente</span>
          </button>
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs hover:bg-brand-400 shadow-lg shadow-brand-500/20 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar medición"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Encabezado del informe */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Informe de Composición Corporal Nivel 1
            </span>
            <h2 className="text-xl font-bold text-white">{patient.name}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1 justify-end">
              <Calendar className="w-3 h-3 text-slate-400" />
              {measurement.date}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Edad: {results.ageYears} años
            </span>
          </div>
        </div>

        {professional && (
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Evaluado por: <strong className="text-slate-300">{professional.name}</strong></span>
            {professional.license && <span>{professional.license}</span>}
          </div>
        )}
      </div>

      {/* Métricas destacadas en tarjetas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Weight className="w-3.5 h-3.5 text-brand-400" /> Peso Corporal
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white">
              {results.weight ?? '—'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Talla: {results.height} cm · IMC: {results.bmi ?? '—'}
          </span>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" /> % Graso ({results.primaryFat?.method})
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {results.primaryFat?.fatPct ?? '—'}
            </span>
            <span className="text-xs text-rose-400/80 font-semibold">%</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Grasa: {results.primaryFat?.fatKg} kg · Magra: {results.primaryFat?.leanKg} kg
          </span>
        </div>
      </div>

      {/* Somatotipo de Heath & Carter y Somatocarta */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">
              Somatotipo de Heath & Carter (1990)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-brand-300">
            {results.somatotype?.category ?? 'Central'}
          </span>
        </div>

        <Somatochart
          current={results.somatotype}
          previous={previousSomatotypes}
          size={300}
        />
      </div>

      {/* Comparativa de Métodos y Composición Corporal */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Composición Corporal e Índices
        </h3>

        <div className="space-y-2 text-xs">
          {/* Withers */}
          {results.withers && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Withers et al. (1987) — Atletas</span>
                <span className="text-brand-400 font-mono font-bold">
                  {results.withers.fatPct}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-400 pt-1">
                <div>
                  <span className="block text-slate-500">Grasa</span>
                  <span className="font-mono text-slate-200">{results.withers.fatKg} kg</span>
                </div>
                <div>
                  <span className="block text-slate-500">Magra</span>
                  <span className="font-mono text-slate-200">{results.withers.leanKg} kg</span>
                </div>
                <div>
                  <span className="block text-slate-500">FMI</span>
                  <span className="font-mono text-slate-200">{results.withers.fmi}</span>
                </div>
                <div>
                  <span className="block text-slate-500">FFMI</span>
                  <span className="font-mono text-slate-200">{results.withers.ffmi}</span>
                </div>
              </div>
            </div>
          )}

          {/* Durnin & Womersley */}
          {results.dw && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Durnin & Womersley (1974)</span>
                <span className="text-sky-400 font-mono font-bold">
                  {results.dw.fatPct}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-400 pt-1">
                <div>
                  <span className="block text-slate-500">Grasa</span>
                  <span className="font-mono text-slate-200">{results.dw.fatKg} kg</span>
                </div>
                <div>
                  <span className="block text-slate-500">Magra</span>
                  <span className="font-mono text-slate-200">{results.dw.leanKg} kg</span>
                </div>
                <div>
                  <span className="block text-slate-500">FMI</span>
                  <span className="font-mono text-slate-200">{results.dw.fmi}</span>
                </div>
                <div>
                  <span className="block text-slate-500">FFMI</span>
                  <span className="font-mono text-slate-200">{results.dw.ffmi}</span>
                </div>
              </div>
            </div>
          )}

          {/* Otros índices */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Suma 6 Pliegues</span>
              <span className="font-mono font-bold text-white text-xs">
                {results.sum6 ? `${results.sum6} mm` : '—'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Índice Cint/Cad</span>
              <span className="font-mono font-bold text-white text-xs">
                {results.waistHipRatio ?? '—'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Área Musc. Brazo</span>
              <span className="font-mono font-bold text-white text-xs">
                {results.armMuscleArea ? `${results.armMuscleArea} cm²` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla detallada de variables ISAK */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Variables Antropométricas Cargadas
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500">
                <th className="pb-2 font-semibold">Variable</th>
                <th className="pb-2 font-semibold text-right">Valor Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {VARIABLES.map((v) => {
                const finalVal = measurement.finals[v.key];
                if (finalVal === undefined) return null;

                return (
                  <tr key={v.key} className="py-2 hover:bg-slate-900/40">
                    <td className="py-1.5 text-slate-300">{v.label}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-white">
                      {finalVal} {v.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {measurement.notes && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <span className="font-semibold text-slate-400 block">Notas de la Consulta:</span>
          <p className="text-slate-300 italic">{measurement.notes}</p>
        </div>
      )}

      {/* Modal para compartir enlace cifrado */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        patient={patient}
        measurements={allPatientMeasurements}
        professional={professional}
      />
    </div>
  );
};
