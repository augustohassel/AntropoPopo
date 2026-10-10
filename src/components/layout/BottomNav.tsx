import React from 'react';
import {
  Users,
  PlusCircle,
  Settings,
  LineChart,
  Compass,
  FileText,
} from 'lucide-react';
import { AppMode } from '../../types';

export type NutriTab = 'patients' | 'new-measurement' | 'settings';
export type PatientTab = 'summary' | 'somatotype' | 'evolution';

interface BottomNavProps {
  appMode: AppMode;
  currentNutriTab: NutriTab;
  currentPatientTab: PatientTab;
  onSelectNutriTab: (tab: NutriTab) => void;
  onSelectPatientTab: (tab: PatientTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  appMode,
  currentNutriTab,
  currentPatientTab,
  onSelectNutriTab,
  onSelectPatientTab,
}) => {
  if (appMode === 'nutri') {
    const nutriTabs = [
      { id: 'patients' as NutriTab, label: 'Pacientes', icon: Users },
      {
        id: 'new-measurement' as NutriTab,
        label: 'Medir',
        icon: PlusCircle,
        highlight: true,
      },
      { id: 'settings' as NutriTab, label: 'Ajustes', icon: Settings },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-800/80 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-4">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {nutriTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentNutriTab === tab.id;

            if (tab.highlight) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectNutriTab(tab.id)}
                  className="flex flex-col items-center group -mt-4 focus:outline-none"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-500 text-slate-950 shadow-brand-500/50 scale-105 ring-2 ring-brand-300'
                        : 'bg-brand-500/90 text-slate-950 shadow-brand-500/30 group-hover:scale-105'
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold transition-colors ${
                      isActive ? 'text-brand-400' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onSelectNutriTab(tab.id)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
                  isActive ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    isActive ? 'stroke-[2.5px]' : 'stroke-2'
                  }`}
                />
                <span className="text-[10px] font-medium tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Modo Paciente
  const patientTabs = [
    { id: 'summary' as PatientTab, label: 'Resumen', icon: FileText },
    { id: 'somatotype' as PatientTab, label: 'Somatocarta', icon: Compass },
    { id: 'evolution' as PatientTab, label: 'Evolución', icon: LineChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-800/80 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-4">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {patientTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPatientTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectPatientTab(tab.id)}
              className={`flex flex-col items-center py-1.5 px-4 rounded-xl transition-all duration-150 ${
                isActive ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive ? 'stroke-[2.5px]' : 'stroke-2'
                }`}
              />
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
