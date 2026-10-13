# Guía del Agente AI (AGENTS.md) - AntropoPopo

Este documento proporciona el contexto arquitectónico, técnico y de diseño para que cualquier agente de inteligencia artificial (Antigravity, Claude, Copilot, Cursor, etc.) comprenda y continúe el desarrollo de **AntropoPopo** dentro del entorno Dev Container o local.

---

## 1. Visión y Propósito del Proyecto

**AntropoPopo** es una Progressive Web App (PWA) con diseño *mobile-first* creada para la carga de antropometría ISAK Nivel 1 por parte de nutricionistas y el seguimiento de composición corporal y somatotipo tanto para el profesional como para el paciente.

### Principios No Negociables
1. **Privacidad Absoluta (Zero-Backend)**:
   - El 100% de los datos reside exclusivamente en el almacenamiento local del dispositivo (IndexedDB mediante Dexie.js).
   - Sin servidores externos ni base de datos en la nube.
2. **Compartición Segura Cliente-a-Cliente**:
   - Traspaso de mediciones del nutricionista al paciente mediante URLs con payload comprimido y cifrado en el fragmento `#` con AES-GCM (Web Crypto) protegido por un PIN.
3. **Fidelidad Matemática & Validación ISAK**:
   - Talla corporal estrictamente en centímetros (cm) con validación de rango (80–230 cm) para evitar errores comunes de unidades.
   - Protocolo ISAK guiado (2 tomas por variable; 3ra toma automática si $\Delta > 5\%$ en pliegues o $> 1\%$ en diámetros/perímetros/básicos).
   - Ecuaciones oficiales: Heath-Carter (1990), Durnin & Womersley (1974), Withers et al. (1987) para hombres y mujeres atletas, Siri (1961), Heymsfield (Área Muscular de Brazo).
4. **Desarrollo Aislado en Dev Container**:
   - El entorno oficial de desarrollo se ejecuta en Docker mediante `.devcontainer/` (Node.js 20 LTS sobre Debian Bookworm, puerto 5173).
5. **Control Estricto de Git (Push con Consentimiento Explícito)**:
   - **NUNCA ejecutar `git push`** de forma autónoma. Todo cambio debe validarse localmente primero (`npm test`, `npm run build`).

---

## 2. Stack Tecnológico

- **Runtime & Bundler**: Node.js 20 LTS + Vite 6
- **Framework UI**: React 18 + TypeScript 5 (Strict mode)
- **Estilos**: Tailwind CSS 3 (Dark mode por defecto, paleta Teal/Slate, glassmorphism sutil, optimizado para touch mobile)
- **Base de Datos Local**: IndexedDB gestionada con `dexie` y `dexie-react-hooks`
- **PWA**: `vite-plugin-pwa` (Service Worker automático, manifiesto standalone)
- **Gráficos & Visualización**: `recharts` + Somatocarta SVG interactiva propia
- **Iconos**: `lucide-react`
- **Testing**: `vitest`

---

## 3. Estructura del Proyecto y Convenciones de Código

```text
src/
├── components/
│   ├── common/      # Componentes reutilizables (ej. Somatochart.tsx en SVG)
│   └── layout/      # Estructura base mobile-first (Header.tsx, BottomNav.tsx)
├── db/              # Configuración de IndexedDB con Dexie (index.ts) y datos semilla (seeds.ts)
├── domain/          # Catálogo y metadatos de variables antropométricas ISAK (variables.ts)
├── features/
│   ├── nutri/       # Flujo del profesional: pacientes, carga guiada (Stepper), detalle, compartición y ajustes
│   └── patient/     # Flujo del paciente: importación por link/PIN y dashboard de evolución
├── types/           # Definiciones de tipos de dominio e interfaces (index.ts)
└── utils/           # Lógica pura: motor matemático (calculator.ts) y cifrado/enlaces (crypto.ts) + tests
```

### Convenciones Técnicas
- **TypeScript Estricto**: Se exige compilación limpia (`tsc -b`) con `strict: true`, `noUnusedLocals`, `noUnusedParameters` y `noFallthroughCasesInSwitch`.
- **Invariante de Serialización (`src/domain/variables.ts`)**: El orden del arreglo `VARIABLES` define tanto el stepper de carga como la serialización posicional compacta de los enlaces compartidos. Si se agregan nuevas variables en el futuro, deben añadirse **siempre al final** para mantener retrocompatibilidad con enlaces existentes.
- **Lógica Pura Testeada**: Toda modificación en fórmulas antropométricas (`src/utils/calculator.ts`) o en empaquetado/cifrado (`src/utils/crypto.ts`) debe contar con cobertura en sus respectivos archivos `.test.ts`.
- **Formateo**: Prettier como formateador por defecto en el Dev Container (`esbenp.prettier-vscode`).

---

## 4. Modelo Matemático

- **Durnin & Womersley (1974)**:
  $D = c - m \times \log_{10}(\Sigma 4\text{ pliegues: tríceps, bíceps, subescapular, cresta ilíaca})$
- **Withers et al. (1987) Atletas**:
  - Hombres: $D = 1.0988 - 0.0004 \times \Sigma 7\text{ pliegues}$
  - Mujeres: $D = 1.20953 - 0.08294 \times \log_{10}(\Sigma 6\text{ pliegues})$
- **Ecuación de Siri (1961)**:
  $\%\text{Grasa} = \left(\frac{4.95}{D} - 4.50\right) \times 100$
- **Somatotipo Heath-Carter (1990)**:
  - Endomorfia ajustada por talla (170.18 / altura)
  - Mesomorfia corregida por pliegues en brazo y pantorrilla
  - Ectomorfia basada en HWR (Height-Weight Ratio)
  - Coordenadas somatocarta: $X = \text{Ecto} - \text{Endo}$, $Y = 2 \times \text{Meso} - (\text{Endo} + \text{Ecto})$
- **Área Muscular de Brazo (AMB)**:
  $AMB = \frac{(C_{brazo} - \pi \times S_{triceps}/10)^2}{4\pi}$ (en cm²)

---

## 5. Comandos de Desarrollo

```bash
# Servidor de desarrollo (puerto 5173)
npm run dev

# Tests unitarios (Vitest)
npm test

# Compilación de producción (TypeScript + Vite build)
npm run build

# Previsualizar build de producción
npm run preview
```

---

## 6. Flujo de Trabajo con Git, Issues y Documentación

1. **Estrategia de Ramas**:
   - Rama base de integración: `dev`.
   - Todo desarrollo o corrección se trabaja en una rama `issue/<n>` creada **siempre a partir de `dev`** (`git checkout dev && git pull origin dev && git checkout -b issue/<n>`).
   - Los Pull Requests de tareas se dirigen hacia `dev`. Una vez mergeados, la rama `issue/<n>` se elimina.
   - La promoción a producción se realiza mediante Pull Request desde `dev` hacia `master`.
2. **Commits y Validación**:
   - Usar **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
   - Ejecutar y verificar `npm test` y `npm run build` antes de dar por completada cualquier tarea.
   - **Prohibido ejecutar `git push`** sin confirmación explícita y previa del usuario.
3. **Glosario de Dominio y Decisiones de Arquitectura**:
   - Mantener actualizado en tiempo real `docs/glosario.md` cada vez que se defina o aclare un concepto de dominio.
   - Registrar en `docs/decisiones/` (formato ADR ligero) toda decisión técnica difícil de revertir que surja de evaluar alternativas reales.
