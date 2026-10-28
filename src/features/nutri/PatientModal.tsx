import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Shield, RefreshCw } from 'lucide-react';
import { FatMethod, Patient, Sex } from '../../types';
import { generateRandomPin } from '../../utils/crypto';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Omit<Patient, 'createdAt' | 'updatedAt'>) => Promise<void>;
  patientToEdit?: Patient;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patientToEdit,
}) => {
  const [name, setName] = useState(patientToEdit?.name ?? '');
  const [sex, setSex] = useState<Sex>(patientToEdit?.sex ?? 'M');
  const [birthDate, setBirthDate] = useState(patientToEdit?.birthDate ?? '1995-01-01');
  const [isAthlete, setIsAthlete] = useState(patientToEdit?.isAthlete ?? true);
  const [primaryFatMethod, setPrimaryFatMethod] = useState<FatMethod>(
    patientToEdit?.primaryFatMethod ?? 'WITHERS'
  );
  const [pin, setPin] = useState(() => patientToEdit?.pin ?? generateRandomPin());
  const [notes, setNotes] = useState(patientToEdit?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(patientToEdit?.name ?? '');
      setSex(patientToEdit?.sex ?? 'M');
      setBirthDate(patientToEdit?.birthDate ?? '1995-01-01');
      setIsAthlete(patientToEdit?.isAthlete ?? true);
      setPrimaryFatMethod(patientToEdit?.primaryFatMethod ?? 'WITHERS');
      setPin(patientToEdit?.pin ?? generateRandomPin());
      setNotes(patientToEdit?.notes ?? '');
    }
  }, [isOpen, patientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: patientToEdit?.id ?? `patient-${Date.now()}`,
        name: name.trim(),
        sex,
        birthDate,
        isAthlete,
        primaryFatMethod,
        pin: pin.trim() || generateRandomPin(),
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">
              {patientToEdit ? 'Editar Paciente' : 'Nuevo Paciente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Augusto"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sexo Biológico
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div>
              <span className="text-xs font-semibold text-white block">Es Atleta</span>
              <span className="text-[11px] text-slate-400 block">
                Aplica la ecuación de Withers et al. (1987)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAthlete}
                onChange={(e) => {
                  setIsAthlete(e.target.checked);
                  if (e.target.checked) setPrimaryFatMethod('WITHERS');
                  else setPrimaryFatMethod('DW');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Método % Graso Principal
              </label>
              <select
                value={primaryFatMethod}
                onChange={(e) => setPrimaryFatMethod(e.target.value as FatMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500 text-xs"
              >
                <option value="WITHERS">Withers (Atletas)</option>
                <option value="DW">Durnin & Womersley</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-brand-400" />
                PIN de Cifrado
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4 dígitos"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-center focus:outline-none focus:border-brand-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setPin(generateRandomPin())}
                  title="Generar nuevo PIN aleatorio"
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-brand-400 hover:border-slate-700 transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objetivos nutricionales, lesiones, etc."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-lg shadow-brand-500/25 transition-all"
            >
              {patientToEdit ? 'Guardar Cambios' : 'Crear Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
