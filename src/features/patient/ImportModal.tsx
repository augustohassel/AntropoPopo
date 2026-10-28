import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, KeyRound, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { decryptPayload } from '../../utils/crypto';
import { SharedReportPayload } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  importToken: string;
  onUnlockSuccess: (payload: SharedReportPayload) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  importToken,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const payload = await decryptPayload<SharedReportPayload>(importToken, pin.trim());

      if (!payload.patient || !payload.measurements) {
        throw new Error('Formato de datos no reconocido.');
      }

      const normalizedPayload: SharedReportPayload = {
        ...payload,
        patient: {
          ...payload.patient,
          pin: pin.trim(),
          professional: payload.professional ?? payload.patient.professional,
          createdAt: payload.patient.createdAt ?? Date.now(),
          updatedAt: payload.patient.updatedAt ?? Date.now(),
        },
        measurements: payload.measurements.map((m) => ({
          ...m,
          patientId: payload.patient.id,
          createdAt: m.createdAt ?? Date.now(),
          updatedAt: m.updatedAt ?? Date.now(),
        })),
      };

      onUnlockSuccess(normalizedPayload);
    } catch {
      setError('PIN incorrecto o enlace dañado. Verificá el PIN con tu nutricionista.');
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center space-y-2 pb-3 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AntropoPopo</h1>
            <p className="text-xs text-brand-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Informe Antropométrico Protegido</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed text-center">
          Ingresá el <strong>PIN</strong> que te envió tu nutricionista para descifrar y visualizar tu informe de composición corporal y evolución.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-400" />
              <span>PIN de Acceso</span>
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
            <span>{isProcessing ? 'Descifrando...' : 'Ver Mi Informe'}</span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

