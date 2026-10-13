import React, { useState, useRef } from 'react';
import { Stethoscope, Upload, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { importBackup, saveProfessionalProfile } from '../../db';
import { ProfessionalProfile } from '../../types';

export const OnboardingView: React.FC = () => {
  const [profile, setProfile] = useState<ProfessionalProfile>({
    name: '',
    license: '',
    phone: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await saveProfessionalProfile({
        name: profile.name.trim(),
        license: profile.license?.trim() || undefined,
        phone: profile.phone?.trim() || undefined,
        email: profile.email?.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await importBackup(content);
        if (!res.success) {
          setErrorMessage(res.message);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="px-4 py-8 sm:px-6 max-w-md mx-auto animate-fade-up space-y-5">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Paso 1 de 2 · Configuración Inicial
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Configurá tu Perfil Profesional
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Antes de cargar tu primer paciente, ingresá tus datos profesionales. Figurarán como firma en los informes antropométricos que compartas.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre y Apellido <span className="text-brand-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Ej. Lic. María Pérez"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Matrícula / Título
              </label>
              <input
                type="text"
                value={profile.license ?? ''}
                onChange={(e) => setProfile({ ...profile, license: e.target.value })}
                placeholder="Ej. MN 12345 · ISAK 1"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={profile.phone ?? ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Ej. +54 9 11 ..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Profesional
            </label>
            <input
              type="email"
              value={profile.email ?? ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="profesional@ejemplo.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !profile.name.trim()}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5 mt-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar y Cargar Primer Paciente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <p className="text-[11px] text-slate-400 text-center">
            ¿Ya usabas AntropoPopo en otro dispositivo?
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restaurar Copia desde Archivo JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
