import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  UserPlus,
  Search,
  ChevronRight,
  PlusCircle,
  Calendar,
  Flame,
  Weight,
  Compass,
} from 'lucide-react';
import { db } from '../../db';
import { Patient } from '../../types';
import { PatientModal } from './PatientModal';
import { computeResults } from '../../utils/calculator';

interface PatientListProps {
  onSelectPatient: (patientId: string) => void;
  onNewMeasurement: (patientId: string) => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  onSelectPatient,
  onNewMeasurement,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const measurements = useLiveQuery(() => db.measurements.toArray(), []);

  const handleSavePatient = async (patientData: Omit<Patient, 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    await db.patients.put({
      ...patientData,
      createdAt: now,
      updatedAt: now,
    });
  };

  const filteredPatients = (patients ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-lg mx-auto pb-24">
      {/* Barra superior con buscador y botón crear */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs hover:bg-brand-400 shadow-lg shadow-brand-500/20 shrink-0 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Lista de pacientes */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800">
            <p className="text-sm text-slate-400">No se encontraron pacientes.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 text-xs text-brand-400 font-semibold hover:underline"
            >
              + Agregar el primer paciente
            </button>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const patientMeas = (measurements ?? [])
              .filter((m) => m.patientId === patient.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const latestMeas = patientMeas[0];
            const results = latestMeas
              ? computeResults(latestMeas.finals, patient, latestMeas.date)
              : null;

            return (
              <div
                key={patient.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-3 group"
              >
                <div
                  onClick={() => onSelectPatient(patient.id)}
                  className="flex items-start justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors">
                        {patient.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {patient.sex === 'M' ? 'Masc' : 'Fem'}
                      </span>
                      {patient.isAthlete && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Atleta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {latestMeas ? (
                        <span>Última toma: {latestMeas.date}</span>
                      ) : (
                        <span>Sin mediciones previas</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                {/* Métricas destacadas de la última medición */}
                {results && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50">
                      <Weight className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Peso</span>
                        <span className="font-bold text-white">{results.weight} kg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          % Grasa ({results.primaryFat?.method})
                        </span>
                        <span className="font-bold text-rose-400">
                          {results.primaryFat?.fatPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Somatotipo</span>
                        <span className="font-bold text-sky-400 text-[11px] truncate block max-w-[80px]">
                          {results.somatotype?.category ?? 'N/D'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón rápido de acción */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {patientMeas.length} medición{patientMeas.length === 1 ? '' : 'es'}
                  </span>
                  <button
                    onClick={() => onNewMeasurement(patient.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 py-1 px-2.5 rounded-lg hover:bg-brand-500/10 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Medir</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePatient}
      />
    </div>
  );
};
