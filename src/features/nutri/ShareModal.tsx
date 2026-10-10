import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Shield, Lock } from 'lucide-react';
import { Measurement, Patient, ProfessionalProfile } from '../../types';
import { createShareableLink } from '../../utils/crypto';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  measurements: Measurement[];
  professional?: ProfessionalProfile;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  patient,
  measurements,
  professional,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setError(null);
    try {
      // Empaquetar datos: paciente (sin ID privado de base si no hace falta, pero con su perfil),
      // profesional y lista de mediciones históricas
      const payload = {
        patient: {
          id: patient.id,
          name: patient.name,
          sex: patient.sex,
          birthDate: patient.birthDate,
          isAthlete: patient.isAthlete,
          primaryFatMethod: patient.primaryFatMethod,
        },
        professional,
        measurements: measurements.map((m) => ({
          id: m.id,
          date: m.date,
          protocol: m.protocol,
          finals: m.finals,
          notes: m.notes,
          formulaVersion: m.formulaVersion,
        })),
        exportedAt: new Date().toISOString(),
      };

      const link = await createShareableLink(payload, patient.pin);
      setShareUrl(link);
    } catch {
      setError('Error al generar el enlace seguro.');
    }
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    const text = `Hola ${patient.name}! Acá tenés tus resultados de antropometría y composición corporal en AntropoPopo. Tu PIN de acceso es: ${patient.pin}\n\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Resultados Antropometría - ${patient.name}`,
          text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback a WhatsApp
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">
              Compartir con {patient.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
          <div className="flex items-center gap-1.5 text-brand-400 font-semibold">
            <Shield className="w-4 h-4" />
            <span>Cifrado de extremo a extremo con AES-GCM</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Los datos van comprimidos dentro del enlace y cifrados con el PIN del paciente.
            Ningún dato pasa por servidores. Al abrirlo, el paciente lo guardará en su propio celular.
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">PIN asignado al paciente:</span>
            <span className="font-mono font-bold text-sm text-brand-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {patient.pin}
            </span>
          </div>
        </div>

        {error ? (
          <p className="text-xs text-rose-400">{error}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Enlace Seguro Generado:
              </label>
              <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-xs text-slate-300 font-mono flex-1 focus:outline-none select-all overflow-hidden text-ellipsis"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0"
                  title="Copiar enlace"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp / Enviar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
