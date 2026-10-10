import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { decryptPayload } from '../../utils/crypto';
import { db } from '../../db';
import { Measurement, Patient, ProfessionalProfile } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importToken: string;
  onImportSuccess: (patientId: string) => void;
}

interface ImportPayload {
  patient: Patient;
  professional?: ProfessionalProfile;
  measurements: Measurement[];
  exportedAt: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importToken,
  onImportSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const payload = await decryptPayload<ImportPayload>(importToken, pin.trim());

      if (!payload.patient || !payload.measurements) {
        throw new Error('Formato de datos no reconocido.');
      }

      // Guardar paciente con PIN recordado y datos del profesional
      const patientToSave: Patient = {
        ...payload.patient,
        pin: pin.trim(),
        professional: payload.professional,
        createdAt: payload.patient.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };

      await db.transaction('rw', db.patients, db.measurements, async () => {
        await db.patients.put(patientToSave);
        for (const m of payload.measurements) {
          await db.measurements.put({
            ...m,
            patientId: patientToSave.id,
            createdAt: m.createdAt ?? Date.now(),
            updatedAt: Date.now(),
          });
        }
      });

      // Limpiar hash de la URL sin recargar
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      onImportSuccess(patientToSave.id);
    } catch (err) {
      setError('PIN incorrecto o enlace dañado. Verificá el PIN con tu nutricionista.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Importar Mediciones</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Recibiste un informe cifrado de tu nutricionista. Ingresá el <strong>PIN</strong> que te proporcionó para descifrar y guardar tu historial en este dispositivo.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-400" />
              PIN de Acceso (ej. 1234)
            </label>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              required
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-xl tracking-widest text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !pin.trim()}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Descifrando...' : 'Descifrar y Abrir Informe'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
