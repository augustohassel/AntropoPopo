import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Patient, Measurement } from '../../types';
import {
  parseMeasurementsCsv,
  generateCsvTemplate,
  downloadCsvFile,
  CsvImportResult,
} from '../../utils/csv';
import { importMeasurementsBatch } from '../../db';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPatients: Patient[];
  existingMeasurements: Measurement[];
  onImportSuccess?: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingPatients,
  existingMeasurements,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [showErrorsDetail, setShowErrorsDetail] = useState(false);
  const [showSkippedDetail, setShowSkippedDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setCsvResult(null);
    setIsProcessing(false);
    setIsImported(false);
    setShowErrorsDetail(false);
    setShowSkippedDetail(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setIsImported(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = parseMeasurementsCsv(content, existingPatients, existingMeasurements);
        setCsvResult(result);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelected(droppedFile);
    }
  };

  const handleConfirmImport = async () => {
    if (!csvResult || csvResult.newMeasurements.length === 0) return;

    setIsProcessing(true);
    try {
      await importMeasurementsBatch(csvResult.newPatients, csvResult.newMeasurements);
      setIsImported(true);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadGenericTemplate = () => {
    const template = generateCsvTemplate();
    downloadCsvFile(template, 'plantilla-controles-antropopopo.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Importación Masiva de Controles (CSV)
              </h2>
              <p className="text-[11px] text-slate-400">
                Carga por lote de mediciones y pacientes (100% local en tu navegador)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Zona de descarga de plantilla */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-200 block">¿No tenés la plantilla?</span>
              <span className="text-[11px] text-slate-400 block">
                Descargá el modelo oficial con cabeceras ISAK Nivel 1.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadGenericTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-brand-400 border border-brand-500/30 text-xs font-semibold shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Plantilla CSV</span>
            </button>
          </div>

          {!file ? (
            /* Dropzone para seleccionar archivo */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-400 group-hover:bg-brand-500/10 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                Arrastrá tu archivo <span className="text-brand-400 font-mono">.csv</span> acá o hacé clic
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Soporta comas (,) o punto y coma (;), fechas ISO o DD/MM/YYYY y formato Excel.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                accept=".csv,text/csv"
                className="hidden"
              />
            </div>
          ) : (
            /* Vista de análisis y resumen del CSV */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="font-mono text-slate-200 truncate">{file.name}</span>
                </div>
                {!isImported && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-rose-400 hover:underline font-semibold shrink-0 ml-2"
                  >
                    Cambiar archivo
                  </button>
                )}
              </div>

              {isImported ? (
                /* Estado exitoso */
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">¡Importación completada!</h3>
                  <p className="text-xs text-slate-300">
                    Se importaron exitosamente{' '}
                    <strong className="text-emerald-400 font-mono">
                      {csvResult?.newMeasurements.length}
                    </strong>{' '}
                    mediciones en IndexedDB.
                  </p>
                  {csvResult && csvResult.newPatients.length > 0 && (
                    <p className="text-xs text-slate-400">
                      Se crearon{' '}
                      <strong className="text-white font-mono">
                        {csvResult.newPatients.length}
                      </strong>{' '}
                      nuevos pacientes en tu listado.
                    </p>
                  )}
                </div>
              ) : csvResult ? (
                /* Métricas del análisis */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-400" /> Mediciones válidas
                      </span>
                      <span className="text-xl font-bold font-mono text-brand-400">
                        {csvResult.newMeasurements.length}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        listas para importar
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" /> Pacientes nuevos
                      </span>
                      <span className="text-xl font-bold font-mono text-indigo-300">
                        {csvResult.newPatients.length}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        se darán de alta automáticamente
                      </span>
                    </div>
                  </div>

                  {/* Avisos de duplicados o errores */}
                  {csvResult.skippedRows.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      <div
                        onClick={() => setShowSkippedDetail(!showSkippedDetail)}
                        className="flex items-center justify-between cursor-pointer font-semibold"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {csvResult.skippedRows.length} controles omitidos por duplicado
                          </span>
                        </span>
                        {showSkippedDetail ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>

                      {showSkippedDetail && (
                        <ul className="mt-2 space-y-1 text-[11px] text-slate-300 border-t border-amber-500/20 pt-2 max-h-32 overflow-y-auto">
                          {csvResult.skippedRows.map((s, idx) => (
                            <li key={idx}>
                              Fila {s.row}: {s.patientName} ({s.date}) — ya existía.
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {csvResult.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                      <div
                        onClick={() => setShowErrorsDetail(!showErrorsDetail)}
                        className="flex items-center justify-between cursor-pointer font-semibold"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>
                            {csvResult.errors.length} filas con error (se omitirán)
                          </span>
                        </span>
                        {showErrorsDetail ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>

                      {showErrorsDetail && (
                        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300 border-t border-rose-500/20 pt-2 max-h-40 overflow-y-auto">
                          {csvResult.errors.map((e, idx) => (
                            <li key={idx} className="bg-slate-950/60 p-1.5 rounded">
                              <strong className="text-rose-400">Fila {e.row}:</strong>{' '}
                              {e.reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {csvResult.newMeasurements.length === 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                      No se encontraron mediciones válidas para importar en este archivo.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {isImported ? 'Cerrar' : 'Cancelar'}
          </button>

          {!isImported && csvResult && csvResult.newMeasurements.length > 0 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar {csvResult.newMeasurements.length} Mediciones</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

