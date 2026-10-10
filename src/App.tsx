import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase, getProfessionalProfile } from './db';
import { AppMode, ProfessionalProfile } from './types';
import { Header } from './components/layout/Header';
import { BottomNav, NutriTab, PatientTab } from './components/layout/BottomNav';
import { PatientList } from './features/nutri/PatientList';
import { NewMeasurementStepper } from './features/nutri/NewMeasurementStepper';
import { MeasurementDetail } from './features/nutri/MeasurementDetail';
import { SettingsView } from './features/nutri/SettingsView';
import { PatientDashboard } from './features/patient/PatientDashboard';
import { ImportModal } from './features/patient/ImportModal';
import { extractImportTokenFromHash } from './utils/crypto';

export const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(() => {
    return (localStorage.getItem('antropopopo_app_mode') as AppMode) || 'nutri';
  });

  const [currentNutriTab, setCurrentNutriTab] = useState<NutriTab>('patients');
  const [currentPatientTab, setCurrentPatientTab] = useState<PatientTab>('summary');

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const [importToken, setImportToken] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [professional, setProfessional] = useState<ProfessionalProfile | undefined>(undefined);

  // Consultas reactivas de Dexie
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const measurements = useLiveQuery(() => db.measurements.toArray(), []);

  // Inicialización de base de datos y detección de token en URL #
  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);
      getProfessionalProfile().then(setProfessional);
    });

    const checkHash = () => {
      if (typeof window !== 'undefined') {
        const token = extractImportTokenFromHash(window.location.hash);
        if (token) {
          setImportToken(token);
          setAppMode('patient');
          localStorage.setItem('antropopopo_app_mode', 'patient');
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleToggleMode = (mode: AppMode) => {
    setAppMode(mode);
    localStorage.setItem('antropopopo_app_mode', mode);
    // Resetear estados transitorios de navegación
    setIsMeasuring(false);
    setActiveMeasurementId(null);
  };

  const handleSelectPatient = (patientId: string) => {
    setActivePatientId(patientId);
    // Si tiene mediciones, abrir la última medición directamente
    const patientMeas = (measurements ?? [])
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (patientMeas.length > 0) {
      setActiveMeasurementId(patientMeas[0].id);
    } else {
      setIsMeasuring(true);
    }
  };

  const handleStartNewMeasurement = (patientId?: string) => {
    const targetId = patientId || activePatientId || patients?.[0]?.id;
    if (targetId) {
      setActivePatientId(targetId);
      setIsMeasuring(true);
      setActiveMeasurementId(null);
      setCurrentNutriTab('patients');
    }
  };

  const handleMeasurementSaved = (measurementId: string) => {
    setIsMeasuring(false);
    setActiveMeasurementId(measurementId);
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wide">Iniciando AntropoPopo...</p>
      </div>
    );
  }

  // Paciente activo para la vista de paciente
  const patientForPatientMode =
    patients?.find((p) => p.id === activePatientId) ?? patients?.[0];

  const patientMeasurements = (measurements ?? []).filter(
    (m) => m.patientId === (patientForPatientMode?.id ?? activePatientId)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
      <Header
        appMode={appMode}
        onToggleMode={handleToggleMode}
        subtitle={
          appMode === 'nutri'
            ? 'Gestión Profesional ISAK Nivel 1'
            : 'Historial y Composición Corporal'
        }
      />

      <main className="flex-1 w-full max-w-lg mx-auto">
        {/* ──────────────── MODO NUTRICIONISTA ──────────────── */}
        {appMode === 'nutri' && (
          <>
            {currentNutriTab === 'patients' && (
              <>
                {/* 1. Vista de carga guiada si está en flujo de medición */}
                {isMeasuring && activePatientId ? (
                  <NewMeasurementStepper
                    patient={patients?.find((p) => p.id === activePatientId)!}
                    onCancel={() => setIsMeasuring(false)}
                    onSaved={handleMeasurementSaved}
                  />
                ) : activeMeasurementId ? (
                  /* 2. Vista de informe detallado de medición */
                  (() => {
                    const activeMeas = measurements?.find((m) => m.id === activeMeasurementId);
                    const activePat = patients?.find((p) => p.id === activeMeas?.patientId);
                    if (!activeMeas || !activePat) return null;

                    const allMeas = (measurements ?? []).filter(
                      (m) => m.patientId === activePat.id
                    );

                    return (
                      <MeasurementDetail
                        measurement={activeMeas}
                        patient={activePat}
                        allPatientMeasurements={allMeas}
                        professional={professional}
                        onBack={() => setActiveMeasurementId(null)}
                        onDeleted={() => setActiveMeasurementId(null)}
                      />
                    );
                  })()
                ) : (
                  /* 3. Lista principal de pacientes */
                  <PatientList
                    onSelectPatient={handleSelectPatient}
                    onNewMeasurement={handleStartNewMeasurement}
                  />
                )}
              </>
            )}

            {currentNutriTab === 'new-measurement' && (
              <NewMeasurementStepper
                patient={
                  patients?.find((p) => p.id === activePatientId) ??
                  patients?.[0] ?? {
                    id: 'sample',
                    name: 'Paciente',
                    sex: 'M',
                    birthDate: '1995-01-01',
                    isAthlete: true,
                    primaryFatMethod: 'WITHERS',
                    pin: '1234',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                }
                onCancel={() => setCurrentNutriTab('patients')}
                onSaved={handleMeasurementSaved}
              />
            )}

            {currentNutriTab === 'settings' && <SettingsView />}
          </>
        )}

        {/* ──────────────── MODO PACIENTE ──────────────── */}
        {appMode === 'patient' && (
          <>
            {patientForPatientMode ? (
              <PatientDashboard
                patient={patientForPatientMode}
                measurements={patientMeasurements}
                currentTab={currentPatientTab}
                professional={professional}
              />
            ) : (
              <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 m-4 space-y-3">
                <p className="text-sm text-slate-300">
                  No tenés mediciones cargadas todavía en este dispositivo.
                </p>
                <p className="text-xs text-slate-500">
                  Pedile a tu nutricionista que te comparta tu enlace seguro con tu PIN.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Navegación inferior ergonómica */}
      <BottomNav
        appMode={appMode}
        currentNutriTab={currentNutriTab}
        currentPatientTab={currentPatientTab}
        onSelectNutriTab={(tab) => {
          setIsMeasuring(false);
          setActiveMeasurementId(null);
          setCurrentNutriTab(tab);
        }}
        onSelectPatientTab={setCurrentPatientTab}
      />

      {/* Modal para descifrar enlaces importados desde WhatsApp/URL hash */}
      {importToken && (
        <ImportModal
          isOpen={true}
          importToken={importToken}
          onClose={() => setImportToken(null)}
          onImportSuccess={(newPatId) => {
            setActivePatientId(newPatId);
            setImportToken(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
