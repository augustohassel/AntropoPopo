import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Eye } from 'lucide-react';
import { db, initializeDatabase, getProfessionalProfile } from './db';
import { SharedReportPayload } from './types';
import { Header } from './components/layout/Header';
import { BottomNav, NutriTab, PatientTab } from './components/layout/BottomNav';
import { PatientList } from './features/nutri/PatientList';
import { NewMeasurementStepper } from './features/nutri/NewMeasurementStepper';
import { MeasurementDetail } from './features/nutri/MeasurementDetail';
import { SettingsView } from './features/nutri/SettingsView';
import { OnboardingView } from './features/nutri/OnboardingView';
import { PatientDashboard } from './features/patient/PatientDashboard';
import { ImportModal } from './features/patient/ImportModal';
import { extractImportTokenFromHash } from './utils/crypto';

const getSessionCacheKey = (token: string) => `antropopopo_shared_${token.slice(0, 32)}`;

export const App: React.FC = () => {
  const [currentNutriTab, setCurrentNutriTab] = useState<NutriTab>('patients');
  const [currentPatientTab, setCurrentPatientTab] = useState<PatientTab>('summary');

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isPreviewingAsPatient, setIsPreviewingAsPatient] = useState(false);

  const [importToken, setImportToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return extractImportTokenFromHash(window.location.hash);
    }
    return null;
  });

  const [sharedReport, setSharedReport] = useState<SharedReportPayload | null>(() => {
    if (typeof window !== 'undefined') {
      const token = extractImportTokenFromHash(window.location.hash);
      if (token) {
        try {
          const cached = sessionStorage.getItem(getSessionCacheKey(token));
          if (cached) return JSON.parse(cached) as SharedReportPayload;
        } catch {
          // Ignorar errores de sessionStorage
        }
      }
    }
    return null;
  });

  const [isDbReady, setIsDbReady] = useState(false);

  // Consultas reactivas de Dexie (para el flujo del nutricionista)
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const measurements = useLiveQuery(() => db.measurements.toArray(), []);
  const professional = useLiveQuery(() => getProfessionalProfile(), [], 'loading' as const);

  // Inicialización de base de datos y detección de token en URL #
  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);
    });

    const checkHash = () => {
      if (typeof window !== 'undefined') {
        const token = extractImportTokenFromHash(window.location.hash);
        setImportToken(token);
        if (token) {
          try {
            const cached = sessionStorage.getItem(getSessionCacheKey(token));
            setSharedReport(cached ? (JSON.parse(cached) as SharedReportPayload) : null);
          } catch {
            setSharedReport(null);
          }
        } else {
          setSharedReport(null);
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleUnlockSharedReport = (payload: SharedReportPayload) => {
    setSharedReport(payload);
    setCurrentPatientTab('summary');
    if (importToken && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(getSessionCacheKey(importToken), JSON.stringify(payload));
      } catch {
        // Ignorar si sessionStorage no está disponible
      }
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setActivePatientId(patientId);
    setIsPreviewingAsPatient(false);
    // Si tiene mediciones, abrir la última medición directamente
    const patientMeas = (measurements ?? [])
      .filter((m) => m.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          b.createdAt - a.createdAt
      );

    if (patientMeas.length > 0) {
      setActiveMeasurementId(patientMeas[0].id);
    } else {
      setIsMeasuring(true);
    }
  };

  const handleSelectPatientMeasurement = (
    patientId: string,
    measurementId: string
  ) => {
    setActivePatientId(patientId);
    setActiveMeasurementId(measurementId);
    setIsMeasuring(false);
    setIsPreviewingAsPatient(false);
    setCurrentNutriTab('patients');
  };

  const handleStartNewMeasurement = (patientId?: string) => {
    const targetId = patientId || activePatientId || patients?.[0]?.id;
    if (targetId) {
      setActivePatientId(targetId);
      setIsMeasuring(true);
      setActiveMeasurementId(null);
      setIsPreviewingAsPatient(false);
      setCurrentNutriTab('patients');
    }
  };

  const handleMeasurementSaved = (measurementId: string) => {
    setIsMeasuring(false);
    setIsPreviewingAsPatient(false);
    setActiveMeasurementId(measurementId);
    setCurrentNutriTab('patients');
  };

  // ──────────────── 1. VISTA WEB EFÍMERA DEL PACIENTE VÍA ENLACE (#import=...) ────────────────
  if (importToken) {
    if (!sharedReport) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
          <ImportModal
            isOpen={true}
            importToken={importToken}
            onUnlockSuccess={handleUnlockSharedReport}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
        <Header subtitle="Informe Antropométrico Personal" />

        <main className="flex-1 w-full max-w-lg mx-auto">
          <PatientDashboard
            patient={sharedReport.patient}
            measurements={sharedReport.measurements}
            currentTab={currentPatientTab}
            professional={sharedReport.professional ?? sharedReport.patient.professional}
          />
        </main>

        <BottomNav
          appMode="patient"
          currentNutriTab={currentNutriTab}
          currentPatientTab={currentPatientTab}
          onSelectNutriTab={() => {}}
          onSelectPatientTab={setCurrentPatientTab}
        />
      </div>
    );
  }

  if (!isDbReady || professional === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wide">Iniciando AntropoPopo...</p>
      </div>
    );
  }

  // ──────────────── 2. ONBOARDING INICIAL DEL PROFESIONAL (SIN DATOS PRECARGADOS) ────────────────
  if (professional === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
        <Header subtitle="Configuración Inicial del Profesional" />
        <main className="flex-1 w-full max-w-lg mx-auto">
          <OnboardingView />
        </main>
      </div>
    );
  }

  // ──────────────── 3. PREVISUALIZACIÓN "VER COMO PACIENTE" DESDE EL NUTRICIONISTA ────────────────
  if (isPreviewingAsPatient && activeMeasurementId) {
    const activeMeas = measurements?.find((m) => m.id === activeMeasurementId);
    const activePat = patients?.find((p) => p.id === activeMeas?.patientId);

    if (activeMeas && activePat) {
      const allMeas = (measurements ?? []).filter((m) => m.patientId === activePat.id);

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
          <Header subtitle="Vista Previa · Informe del Paciente" />

          <div className="bg-brand-500/10 border-b border-brand-500/20 px-4 py-2">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-400" />
                <span>Previsualizando vista del paciente</span>
              </span>
              <button
                onClick={() => setIsPreviewingAsPatient(false)}
                className="flex items-center gap-1 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-400 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Volver al modo profesional</span>
              </button>
            </div>
          </div>

          <main className="flex-1 w-full max-w-lg mx-auto">
            <PatientDashboard
              patient={activePat}
              measurements={allMeas}
              currentTab={currentPatientTab}
              professional={professional}
              initialMeasurementId={activeMeas.id}
            />
          </main>

          <BottomNav
            appMode="patient"
            currentNutriTab={currentNutriTab}
            currentPatientTab={currentPatientTab}
            onSelectNutriTab={() => {}}
            onSelectPatientTab={setCurrentPatientTab}
          />
        </div>
      );
    }
  }

  // ──────────────── 4. APLICACIÓN PRINCIPAL DEL NUTRICIONISTA ────────────────
  const targetPatientForStepper =
    patients?.find((p) => p.id === activePatientId) ?? patients?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
      <Header subtitle="Gestión Profesional ISAK Nivel 1" />

      <main className="flex-1 w-full max-w-lg mx-auto">
        {currentNutriTab === 'patients' && (
          <>
            {/* 1. Vista de carga guiada si está en flujo de medición */}
            {isMeasuring && activePatientId && patients?.find((p) => p.id === activePatientId) ? (
              <NewMeasurementStepper
                patient={patients.find((p) => p.id === activePatientId)!}
                onCancel={() => setIsMeasuring(false)}
                onSaved={handleMeasurementSaved}
              />
            ) : activeMeasurementId ? (
              /* 2. Vista de informe detallado de medición */
              (() => {
                const activeMeas = measurements?.find((m) => m.id === activeMeasurementId);
                const activePat = patients?.find((p) => p.id === activeMeas?.patientId);
                if (!activeMeas || !activePat) return null;

                const allMeas = (measurements ?? [])
                  .filter((m) => m.patientId === activePat.id)
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime() ||
                      b.createdAt - a.createdAt
                  );

                return (
                  <MeasurementDetail
                    measurement={activeMeas}
                    patient={activePat}
                    allPatientMeasurements={allMeas}
                    professional={professional}
                    onBack={() => setActiveMeasurementId(null)}
                    onDeleted={() => {
                      const remaining = allMeas.filter(
                        (m) => m.id !== activeMeas.id
                      );
                      setActiveMeasurementId(remaining[0]?.id ?? null);
                    }}
                    onPreviewAsPatient={() => {
                      setCurrentPatientTab('summary');
                      setIsPreviewingAsPatient(true);
                    }}
                    onSelectMeasurement={(measId) => setActiveMeasurementId(measId)}
                    onNewMeasurement={() => handleStartNewMeasurement(activePat.id)}
                  />
                );
              })()
            ) : (
              /* 3. Lista principal de pacientes */
              <PatientList
                onSelectPatient={handleSelectPatient}
                onSelectMeasurement={handleSelectPatientMeasurement}
                onNewMeasurement={handleStartNewMeasurement}
              />
            )}
          </>
        )}

        {currentNutriTab === 'new-measurement' && (
          <>
            {targetPatientForStepper ? (
              <NewMeasurementStepper
                patient={targetPatientForStepper}
                onCancel={() => setCurrentNutriTab('patients')}
                onSaved={handleMeasurementSaved}
              />
            ) : (
              <PatientList
                onSelectPatient={handleSelectPatient}
                onSelectMeasurement={handleSelectPatientMeasurement}
                onNewMeasurement={handleStartNewMeasurement}
              />
            )}
          </>
        )}

        {currentNutriTab === 'settings' && <SettingsView />}
      </main>

      {/* Navegación inferior ergonómica */}
      <BottomNav
        appMode="nutri"
        currentNutriTab={currentNutriTab}
        currentPatientTab={currentPatientTab}
        onSelectNutriTab={(tab) => {
          setIsMeasuring(false);
          setIsPreviewingAsPatient(false);
          setActiveMeasurementId(null);
          setCurrentNutriTab(tab);
        }}
        onSelectPatientTab={setCurrentPatientTab}
      />
    </div>
  );
};

export default App;


