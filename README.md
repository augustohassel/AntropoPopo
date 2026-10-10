# AntropoPopo 🏃‍♂️📊

> **Aplicación Mobile-First y PWA para Antropometría ISAK Nivel 1, Composición Corporal y Somatotipo de Heath & Carter con 100% privacidad local (Zero-Backend).**

AntropoPopo está diseñada para que el nutricionista cargue mediciones en el consultorio de forma rápida y asistida con el pulgar, y comparta los resultados al instante con el paciente mediante **enlaces cifrados con AES-GCM protegidos por PIN**, sin almacenar datos en servidores externos.

---

## 🚀 Características Principales

- **📱 Mobile-First & PWA**: Diseñada específicamente para usar con una mano en el celular. Se instala en la pantalla de inicio (iOS / Android) y funciona 100% offline.
- **🔒 Privacidad Absoluta (Zero-Backend)**: Todos los datos residen en el almacenamiento local del dispositivo (IndexedDB mediante Dexie.js).
- **🔑 Compartición Segura Nutri → Paciente**: El nutricionista genera un enlace con los datos comprimidos en el hash de la URL (`#import=...`) cifrado de extremo a extremo con AES-GCM. El paciente ingresa su PIN en su propio teléfono y guarda su historial localmente.
- **🎯 Protocolo ISAK Nivel 1 Guiado**: 2 tomas obligatorias por variable; si la diferencia supera la tolerancia ISAK (5% en pliegues, 1% en el resto), la aplicación solicita automáticamente una 3ra toma de control y aplica la mediana.
- **📐 Fórmulas Oficiales Validadas**:
  - **Somatotipo de Heath & Carter (1990)** con somatocarta interactiva (triángulo de Reuleaux en SVG) y trayectoria histórica.
  - **Densidad y % Grasa de Withers et al. (1987)** para atletas masculinos (7 pliegues) y femeninas (6 pliegues).
  - **Durnin & Womersley (1974)** por franjas de edad y sexo.
  - **Fórmula de Siri (1961)** para estimación de grasa corporal y masa magra.
  - **Área Muscular de Brazo (AMB)** según Heymsfield.
  - Talla siempre en centímetros (con bloqueo de rango para prevenir el error típico de cargar en metros).
- **📈 Histórico y Gráficos de Evolución**: Evolución temporal de peso, % graso, masa magra y sumatoria de 6 pliegues mediante Recharts, además de comparador directo entre consultas.
- **💾 Copias de Seguridad en 1 Clic**: Exportación e importación en **JSON** (restaurable) y exportación a **CSV** (para Microsoft Excel y Google Sheets).
- **🐳 Entorno Aislado en Dev Container**: Configurado con Docker (`.devcontainer/`) para desarrollo reproducible y seguro.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Bundler**: [Vite 6](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Estilos**: [Tailwind CSS 3](https://tailwindcss.com/) (Dark mode por defecto, paleta Teal/Slate, glassmorphism sutil)
- **Base de Datos Local**: [Dexie.js](https://dexie.org/) (IndexedDB reactivo con `dexie-react-hooks`)
- **Visualización**: SVG nativo para Somatocarta + [Recharts](https://recharts.org/) para gráficos temporales
- **Testing**: [Vitest](https://vitest.dev/)
- **Iconos**: [Lucide React](https://lucide.dev/)

---

## 🏃 Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo Vite
npm run dev

# Ejecutar tests unitarios
npm test

# Compilación de producción
npm run build

# Previsualizar bundle de producción
npm run preview
```

### Desarrollo en Docker / Dev Container:

Podés abrir este repositorio en VS Code utilizando la extensión **Dev Containers** (`Remote - Containers`) para ejecutar todo dentro de un contenedor Debian Bookworm con Node.js 20 LTS preconfigurado.