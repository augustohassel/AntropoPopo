import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, PlusCircle } from 'lucide-react';
import { Measurement, Patient } from '../../types';
import {
  buildEvolutionData,
  calculateEvolutionComparison,
} from '../../utils/calculator';
import { useTheme } from '../../context/ThemeContext';

export interface EvolutionReportProps {
  measurements: Measurement[];
  patient: Patient;
  onNewMeasurement?: () => void;
  emptyStateDescription?: string;
}

export const EvolutionReport: React.FC<EvolutionReportProps> = ({
  measurements,
  patient,
  onNewMeasurement,
  emptyStateDescription,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const evolutionData = useMemo(
    () => buildEvolutionData(measurements, patient),
    [measurements, patient]
  );

  const comparison = useMemo(
    () => calculateEvolutionComparison(evolutionData),
    [evolutionData]
  );

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDark ? '#64748b' : '#94a3b8';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    fontSize: '11px',
    color: isDark ? '#ffffff' : '#0f172a',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
  };

  if (evolutionData.length < 2) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-3">
        <Activity className="w-8 h-8 text-brand-400 mx-auto" />
        <p className="text-sm font-semibold text-white">
          Se requiere más de una medición para ver gráficos de evolución.
        </p>
        <p className="text-xs text-slate-400">
          {emptyStateDescription ||
            'Registrá al menos dos consultas para poder comparar los cambios corporales a lo largo del tiempo.'}
        </p>
        {onNewMeasurement && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onNewMeasurement}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs hover:bg-brand-400 shadow-md shadow-brand-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cargar nueva medición</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grilla responsive para pantallas medianas/grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Peso Corporal */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Evolución del Peso Corporal (kg)
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dateLabel" stroke={axisStroke} fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke={axisStroke} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
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
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dateLabel" stroke={axisStroke} fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke={axisStroke} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
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
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 lg:col-span-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Evolución Suma 6 Pliegues (mm)
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dateLabel" stroke={axisStroke} fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke={axisStroke} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
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
      </div>

      {/* Tabla Comparativa entre Primera y Última consulta */}
      {comparison && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            Comparativa: Primera vs Última Consulta
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500">
                  <th className="pb-1.5 font-semibold">Métrica</th>
                  <th className="pb-1.5 font-semibold text-center">{comparison.firstDate}</th>
                  <th className="pb-1.5 font-semibold text-center">{comparison.lastDate}</th>
                  <th className="pb-1.5 font-semibold text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {/* Peso */}
                <tr>
                  <td className="py-2 text-slate-300 font-sans">Peso (kg)</td>
                  <td className="py-2 text-center text-slate-400">
                    {comparison.peso.first ?? '—'}
                  </td>
                  <td className="py-2 text-center text-white font-bold">
                    {comparison.peso.last ?? '—'}
                  </td>
                  <td className="py-2 text-right">
                    {comparison.peso.diff !== undefined ? (
                      <span
                        className={
                          comparison.peso.diff <= 0
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }
                      >
                        {comparison.peso.diff > 0
                          ? `+${comparison.peso.diff}`
                          : comparison.peso.diff}{' '}
                        kg
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>

                {/* % Grasa */}
                <tr>
                  <td className="py-2 text-slate-300 font-sans">% Grasa</td>
                  <td className="py-2 text-center text-slate-400">
                    {comparison.grasaPct.first !== undefined
                      ? `${comparison.grasaPct.first}%`
                      : '—'}
                  </td>
                  <td className="py-2 text-center text-rose-400 font-bold">
                    {comparison.grasaPct.last !== undefined
                      ? `${comparison.grasaPct.last}%`
                      : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {comparison.grasaPct.diff !== undefined ? (
                      <span
                        className={
                          comparison.grasaPct.diff <= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {comparison.grasaPct.diff > 0
                          ? `+${comparison.grasaPct.diff}`
                          : comparison.grasaPct.diff}
                        %
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>

                {/* Suma 6 */}
                <tr>
                  <td className="py-2 text-slate-300 font-sans">Suma 6 (mm)</td>
                  <td className="py-2 text-center text-slate-400">
                    {comparison.suma6.first ?? '—'}
                  </td>
                  <td className="py-2 text-center text-purple-400 font-bold">
                    {comparison.suma6.last ?? '—'}
                  </td>
                  <td className="py-2 text-right">
                    {comparison.suma6.diff !== undefined ? (
                      <span
                        className={
                          comparison.suma6.diff <= 0
                            ? 'text-emerald-400'
                            : 'text-purple-400'
                        }
                      >
                        {comparison.suma6.diff > 0
                          ? `+${comparison.suma6.diff}`
                          : comparison.suma6.diff}{' '}
                        mm
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
