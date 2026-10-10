import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  exportBackup,
  exportMeasurementsCSV,
  getProfessionalProfile,
  importBackup,
  requestPersistentStorage,
  resetDatabase,
  saveProfessionalProfile,
} from '../../db';
import { ProfessionalProfile } from '../../types';

export const SettingsView: React.FC = () => {
  const [profile, setProfile] = useState<ProfessionalProfile>({
    name: '',
    license: '',
    phone: '',
    email: '',
  });
  const [isPersisted, setIsPersisted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prof = await getProfessionalProfile();
    setProfile(prof);

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      const persisted = await navigator.storage.persisted();
      setIsPersisted(persisted);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfessionalProfile(profile);
    showMessage('Perfil profesional actualizado correctamente.', true);
  };

  const showMessage = (msg: string, success: boolean) => {
    setStatusMessage(msg);
    setIsSuccess(success);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleExportJSON = async () => {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antropopopo-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Backup JSON descargado con éxito.', true);
    } catch {
      showMessage('Error al exportar backup.', false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await exportMeasurementsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antropopopo-mediciones-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Planilla CSV descargada con éxito.', true);
    } catch {
      showMessage('Error al exportar CSV.', false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await importBackup(content);
        showMessage(res.message, res.success);
        if (res.success) {
          await loadSettings();
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRequestPersist = async () => {
    const res = await requestPersistentStorage();
    setIsPersisted(res);
    if (res) {
      showMessage('Almacenamiento persistente concedido.', true);
    } else {
      showMessage('El navegador no permitió almacenamiento persistente.', false);
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        '¿Restablecer base de datos? Se restaurarán los datos de prueba y se perderán cambios no exportados.'
      )
    ) {
      await resetDatabase();
      await loadSettings();
      showMessage('Base de datos restablecida a los valores iniciales.', true);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-lg mx-auto pb-28 animate-fade-up">
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            isSuccess
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Perfil del Profesional */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-brand-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Perfil Profesional</h3>
            <p className="text-[11px] text-slate-400">
              Estos datos figuran en los informes que compartís con tus pacientes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Nombre y Apellido
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Ej. Francis Holway"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Matrícula / Título
              </label>
              <input
                type="text"
                value={profile.license ?? ''}
                onChange={(e) => setProfile({ ...profile, license: e.target.value })}
                placeholder="Ej. MN 4822"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={profile.phone ?? ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Ej. 4822-9436"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Email Profesional
            </label>
            <input
              type="email"
              value={profile.email ?? ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="fholway@hotmail.com"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
          >
            Guardar Perfil
          </button>
        </form>
      </div>

      {/* Copias de Seguridad y Resguardo */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Copias de Seguridad (Zero-Backend)</h3>
            <p className="text-[11px] text-slate-400">
              Tus datos residen 100% en este dispositivo. Hacé copias regulares.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-white transition-all text-center"
          >
            <Download className="w-4 h-4 text-brand-400 shrink-0" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-white transition-all text-center"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Exportar CSV</span>
          </button>
        </div>

        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
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

        {/* Persistencia de almacenamiento */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-300 font-semibold block">Almacenamiento Persistente</span>
            <span className="text-[11px] text-slate-500 block">
              {isPersisted ? 'Protegido contra desalojo' : 'No persistido'}
            </span>
          </div>
          {!isPersisted && (
            <button
              onClick={handleRequestPersist}
              className="text-xs text-brand-400 hover:underline font-semibold"
            >
              Solicitar
            </button>
          )}
        </div>
      </div>

      {/* Zona de peligro: Resetear base de datos */}
      <div className="glass-panel p-4 rounded-2xl border border-rose-900/30 space-y-2">
        <h4 className="text-xs font-bold text-rose-400">Zona de Riesgo</h4>
        <p className="text-[11px] text-slate-400">
          Podés restablecer la base de datos a los valores de muestra si querés empezar de cero.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restablecer Datos de Muestra</span>
        </button>
      </div>
    </div>
  );
};
