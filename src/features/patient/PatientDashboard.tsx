import React, { useState } from 'react';
import {
  Weight,
  Flame,
  Activity,
  Calendar,
  Compass,
  Stethoscope,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Measurement, Patient, ProfessionalProfile } from '../../types';
import { computeResults, round } from '../../utils/calculator';
import { Somatochart } from '../../components/common/Somatochart';
import { PatientTab } from '../../components/layout/BottomNav';
import { VARIABLES } from '../../domain/variables';

interface PatientDashboardProps {
  patient: Patient;
  measurements: Measurement[];
  currentTab: PatientTab;
  professional?: ProfessionalProfile;
  initialMeasurementId?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patient,
  measurements,
  currentTab,
  professional,
  initialMeasurementId,
}) => {
  // Ordenar de más reciente a más antigua
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const [selectedMeasIndex, setSelectedMeasIndex] = useState(() => {
    if (initialMeasurementId) {
      const idx = sortedMeasurements.findIndex((m) => m.id === initialMeasurementId);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  if (sortedMeasurements.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 m-4">
        <p className="text-sm text-slate-400">
          No hay mediciones registradas para {patient.name}.
        </p>
      </div>
    );
  }

  const currentMeasurement = sortedMeasurements[selectedMeasIndex] ?? sortedMeasurements[0];
  const results = computeResults(
    currentMeasurement.finals,
    patient,
    currentMeasurement.date
  );

  // Datos para gráficos de evolución (orden cronológico ascendente)
  const chronological = [...sortedMeasurements].reverse();
  const evolutionData = chronological.map((m) => {
    const r = computeResults(m.finals, patient, m.date);
    return {
      date: m.date,
      peso: r.weight,
      grasaPct: r.primaryFat?.fatPct,
      grasaKg: r.primaryFat?.fatKg,
      magraKg: r.primaryFat?.leanKg,
      suma6: r.sum6,
      imc: r.bmi,
    };
  });

  // Trayectoria histórica somatocarta
  const historicalSomatotypes = chronological
    .map((m) => computeResults(m.finals, patient, m.date).somatotype)
    .filter(Boolean) as any[];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-lg mx-auto pb-28 animate-fade-up">
      {/* Encabezado con selector de consulta */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">
              Mi Perfil Antropométrico
            </span>
            <h2 className="text-xl font-bold text-white">{patient.name}</h2>
          </div>

          {/* Selector de fecha de consulta */}
          {sortedMeasurements.length > 1 && (
            <select
              value={selectedMeasIndex}
              onChange={(e) => setSelectedMeasIndex(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
            >
              {sortedMeasurements.map((m, idx) => (
                <option key={m.id} value={idx}>
                  {m.date}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Consulta: <strong className="text-slate-200">{currentMeasurement.date}</strong>
          </span>
          <span>Edad: {results.ageYears} años</span>
        </div>
      </div>

      {/* ──────────────── TAB 1: RESUMEN EJECUTIVO ──────────────── */}
      {currentTab === 'summary' && (
        <div className="space-y-4">
          {/* Tarjetas Principales: Peso & Grasa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Weight className="w-4 h-4 text-brand-400" /> Peso Corporal
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {results.weight ?? '—'}
                </span>
                <span className="text-xs text-slate-400 font-bold">kg</span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Talla: {results.height} cm · IMC: {results.bmi ?? '—'}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" /> % Grasa Corporal
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold font-mono text-rose-400">
                  {results.primaryFat?.fatPct ?? '—'}
                </span>
                <span className="text-xs text-rose-400/80 font-bold">%</span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Método: {results.primaryFat?.method}
              </span>
            </div>
          </div>

          {/* Desglose de Masa Grasa vs Magra */}
          {results.primaryFat && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Fraccionamiento Bicompartimental
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[11px] font-semibold text-rose-300 block">Masa Grasa</span>
                  <span className="text-xl font-bold font-mono text-rose-400">
                    {results.primaryFat.fatKg} kg
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    FMI: {results.primaryFat.fmi} kg/m²
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-center">
                  <span className="text-[11px] font-semibold text-brand-300 block">Masa Magra</span>
                  <span className="text-xl font-bold font-mono text-brand-400">
                    {results.primaryFat.leanKg} kg
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    FFMI: {results.primaryFat.ffmi} kg/m²
                  </span>
                </div>
              </div>

              {/* Barra proporcional visual */}
              <div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-rose-500 h-full"
                    style={{ width: `${results.primaryFat.fatPct}%` }}
                    title={`Grasa: ${results.primaryFat.fatPct}%`}
                  />
                  <div
                    className="bg-brand-500 h-full flex-1"
                    title={`Masa Magra: ${(100 - results.primaryFat.fatPct).toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Grasa ({results.primaryFat.fatPct}%)</span>
                  <span>Masa Libre de Grasa ({(100 - results.primaryFat.fatPct).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Indicadores Adicionales */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-panel p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">Suma 6 Pliegues</span>
              <span className="font-mono font-bold text-white text-sm">
                {results.sum6 ? `${results.sum6} mm` : '—'}
              </span>
            </div>

            <div className="glass-panel p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">Índice Cint/Cad</span>
              <span className="font-mono font-bold text-white text-sm">
                {results.waistHipRatio ?? '—'}
              </span>
            </div>

            <div className="glass-panel p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">Área Musc. Brazo</span>
              <span className="font-mono font-bold text-white text-sm">
                {results.armMuscleArea ? `${results.armMuscleArea} cm²` : '—'}
              </span>
            </div>
          </div>

          {/* Tabla detallada de variables ISAK medidas */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Variables Antropométricas Medidas (ISAK Nivel 1)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-500">
                    <th className="pb-2 font-semibold">Variable</th>
                    <th className="pb-2 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {VARIABLES.map((v) => {
                    const finalVal = currentMeasurement.finals[v.key];
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

          {/* Notas de la consulta */}
          {currentMeasurement.notes && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <span className="font-semibold text-slate-400 block">Notas de la Consulta:</span>
              <p className="text-slate-300 italic">{currentMeasurement.notes}</p>
            </div>
          )}

          {/* Profesional evaluador */}
          {(professional || patient.professional) && (
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Evaluado por:</span>
                <span className="font-bold text-slate-200">
                  {(professional || patient.professional)?.name}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {(professional || patient.professional)?.license} · {(professional || patient.professional)?.phone}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: SOMATOTIPO Y SOMATOCARTA ──────────────── */}
      {currentTab === 'somatotype' && (
        <div className="space-y-4">
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
              previous={historicalSomatotypes}
              size={320}
            />
          </div>

          {/* Explicación de los 3 componentes según Carter & Heath */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Interpretación de tu Somatotipo
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex justify-between items-center font-bold text-rose-300">
                  <span>Endomorfia (Adiposidad Relativa)</span>
                  <span className="font-mono text-sm">{results.somatotype?.endo}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Indica el grado de grasa subcutánea y redondez del cuerpo.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex justify-between items-center font-bold text-sky-300">
                  <span>Mesomorfia (Desarrollo Músculo-Esquelético)</span>
                  <span className="font-mono text-sm">{results.somatotype?.meso}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Refleja la robustez ósea y el volumen muscular relativo a la altura.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex justify-between items-center font-bold text-purple-300">
                  <span>Ectomorfia (Linealidad Relativa)</span>
                  <span className="font-mono text-sm">{results.somatotype?.ecto}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Representa la longitud y esbeltez respecto al peso corporal (HWR: {results.somatotype?.hwr}).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: EVOLUCIÓN TEMPORAL ──────────────── */}
      {currentTab === 'evolution' && (
        <div className="space-y-4">
          {evolutionData.length < 2 ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-2">
              <Activity className="w-8 h-8 text-brand-400 mx-auto" />
              <p className="text-sm font-semibold text-white">
                Se requiere más de una medición para ver gráficos de evolución.
              </p>
              <p className="text-xs text-slate-400">
                Cuando tu nutricionista te envíe nuevas consultas, vas a poder comparar tus cambios acá.
              </p>
            </div>
          ) : (
            <>
              {/* Gráfico de Peso Corporal */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Evolución del Peso Corporal (kg)
                </h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        name="Peso (kg)"
                        stroke="#06c4ae"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#06c4ae' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de % Graso */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Evolución del % Graso
                </h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="grasaPct"
                        name="% Grasa"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#f43f5e' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Suma 6 Pliegues */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Evolución Suma 6 Pliegues (mm)
                </h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="suma6"
                        name="Suma 6 (mm)"
                        stroke="#a855f7"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#a855f7' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabla Comparativa entre Primera y Última consulta */}
              {evolutionData.length >= 2 && (
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Comparativa: Primera vs Última Consulta
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500">
                          <th className="pb-1.5 font-semibold">Métrica</th>
                          <th className="pb-1.5 font-semibold text-center">{evolutionData[0].date}</th>
                          <th className="pb-1.5 font-semibold text-center">
                            {evolutionData[evolutionData.length - 1].date}
                          </th>
                          <th className="pb-1.5 font-semibold text-right">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {/* Peso */}
                        <tr>
                          <td className="py-2 text-slate-300 font-sans">Peso (kg)</td>
                          <td className="py-2 text-center text-slate-400">{evolutionData[0].peso}</td>
                          <td className="py-2 text-center text-white font-bold">
                            {evolutionData[evolutionData.length - 1].peso}
                          </td>
                          <td className="py-2 text-right">
                            {(() => {
                              const diff = round(
                                (evolutionData[evolutionData.length - 1].peso ?? 0) -
                                  (evolutionData[0].peso ?? 0),
                                1
                              );
                              return (
                                <span
                                  className={
                                    diff <= 0 ? 'text-emerald-400' : 'text-slate-300'
                                  }
                                >
                                  {diff > 0 ? `+${diff}` : diff} kg
                                </span>
                              );
                            })()}
                          </td>
                        </tr>

                        {/* % Grasa */}
                        <tr>
                          <td className="py-2 text-slate-300 font-sans">% Grasa</td>
                          <td className="py-2 text-center text-slate-400">
                            {evolutionData[0].grasaPct}%
                          </td>
                          <td className="py-2 text-center text-rose-400 font-bold">
                            {evolutionData[evolutionData.length - 1].grasaPct}%
                          </td>
                          <td className="py-2 text-right">
                            {(() => {
                              const diff = round(
                                (evolutionData[evolutionData.length - 1].grasaPct ?? 0) -
                                  (evolutionData[0].grasaPct ?? 0),
                                1
                              );
                              return (
                                <span
                                  className={
                                    diff <= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }
                                >
                                  {diff > 0 ? `+${diff}` : diff}%
                                </span>
                              );
                            })()}
                          </td>
                        </tr>

                        {/* Suma 6 */}
                        <tr>
                          <td className="py-2 text-slate-300 font-sans">Suma 6 (mm)</td>
                          <td className="py-2 text-center text-slate-400">
                            {evolutionData[0].suma6}
                          </td>
                          <td className="py-2 text-center text-purple-400 font-bold">
                            {evolutionData[evolutionData.length - 1].suma6}
                          </td>
                          <td className="py-2 text-right">
                            {(() => {
                              const diff = round(
                                (evolutionData[evolutionData.length - 1].suma6 ?? 0) -
                                  (evolutionData[0].suma6 ?? 0),
                                1
                              );
                              return (
                                <span
                                  className={
                                    diff <= 0 ? 'text-emerald-400' : 'text-purple-400'
                                  }
                                >
                                  {diff > 0 ? `+${diff}` : diff} mm
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
