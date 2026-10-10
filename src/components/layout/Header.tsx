import React from 'react';
import { Activity, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';
import { AppMode } from '../../types';

interface HeaderProps {
  appMode: AppMode;
  onToggleMode: (mode: AppMode) => void;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ appMode, onToggleMode, subtitle }) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              AntropoPopo
            </h1>
            {subtitle ? (
              <p className="text-xs text-slate-400">{subtitle}</p>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>100% Local & Privado</span>
              </div>
            )}
          </div>
        </div>

        {/* Selector de Modo: Nutri / Paciente */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 flex items-center shadow-inner">
            <button
              onClick={() => onToggleMode('nutri')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                appMode === 'nutri'
                  ? 'bg-brand-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo Nutricionista"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Nutri</span>
            </button>
            <button
              onClick={() => onToggleMode('patient')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                appMode === 'patient'
                  ? 'bg-brand-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo Paciente"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Paciente</span>
            </button>
          </div>

          <span
            className="text-[10px] font-mono font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60 hidden sm:inline-block"
            title={`Versión: v${__APP_VERSION__}`}
          >
            v{__APP_VERSION__}
          </span>
        </div>
      </div>
    </header>
  );
};
