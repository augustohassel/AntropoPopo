# Glosario de Dominio - AntropoPopo

Este documento registra la jerga funcional, entidades de negocio y conceptos antropométricos utilizados en **AntropoPopo**. Debe actualizarse en tiempo real cada vez que se introduzca, aclare o redefina un término del dominio.

---

### Protocolo ISAK Nivel 1 (Perfil Restringido)
- **Definición**: Conjunto estandarizado de 17 variables antropométricas definido por la *International Society for the Advancement of Kinanthropometry* (ISAK), compuesto por 2 medidas básicas (peso y talla), 2 diámetros óseos (humeral y femoral), 5 perímetros (brazo relajado, brazo flexionado en tensión, cintura mínima, cadera máxima y pantorrilla máxima) y 8 pliegues cutáneos (tríceps, subescapular, bíceps, cresta ilíaca, supraespinal, abdominal, muslo medial y pantorrilla).
- **Alcance / Propósito**: Constituye el catálogo completo de variables que el nutricionista releva en una consulta dentro de la aplicación y a partir del cual se calculan todos los indicadores de composición corporal y somatotipo.
- **Lo que NO es**: No incluye las variables adicionales del Perfil Completo (ISAK Nivel 2).

### Toma (Take), Pasada (Serie ISAK) y Valor Final (Final)
- **Definición**: Una **Toma** es cada medición individual registrada por el profesional para un sitio anatómico durante la sesión. Una **Pasada (o Serie ISAK)** es el recorrido secuencial completo por el listado de variables antropométricas registrando una única toma por sitio antes de volver a comenzar. El **Valor Final** es el valor consolidado de cada variable que se utiliza en las fórmulas antropométricas.
- **Alcance / Propósito**: Siguiendo la metodología real de trabajo ISAK en consultorio (para evitar sesgos de memoria del evaluador y compresión inmediata del tejido adiposo), la carga se organiza en hasta 3 pasadas secuenciales:
  1. **1ra Pasada (Toma 1)**: Recorrido de todas las variables registrando la primera medición (con opción de finalizar con 1 sola pasada en consultas rápidas).
  2. **2da Pasada (Toma 2)**: Segundo recorrido sobre las variables para registrar la segunda medición y evaluar el error técnico relativo ($\Delta$).
  3. **3ra Pasada (Toma 3 de desempate)**: Recorrido filtrado exclusivamente sobre aquellas variables cuya diferencia entre Toma 1 y Toma 2 superó la tolerancia ISAK ($> 5\%$ en pliegues cutáneos o $> 1\%$ en datos básicos, diámetros y perímetros).
  El Valor Final se resuelve como el **valor único** si hay 1 toma, el **promedio** cuando hay 2 tomas o la **mediana** cuando hay 3 tomas.
- **Lo que NO es**: Las tomas crudas pertenecen exclusivamente al registro de auditoría del nutricionista y no se transmiten en el enlace compartido al paciente (quien sólo recibe los valores finales).

### Somatotipo de Heath-Carter y Somatocarta
- **Definición**: Sistema de cuantificación de la forma y composición corporal actual del individuo expresado en tres componentes numéricos: **Endomorfia** (adiposidad relativa), **Mesomorfia** (desarrollo músculo-esquelético relativo) y **Ectomorfia** (linealidad relativa basada en el cociente talla/peso o HWR). La **Somatocarta** es su representación gráfica bidimensional sobre un triángulo de Reuleaux con coordenadas $(X, Y)$.
- **Alcance / Propósito**: Permite clasificar el biotipo del paciente y visualizar su trayectoria evolutiva entre consultas dentro de la gráfica interactiva.
- **Lo que NO es**: No es una estimación directa de masa grasa o muscular en kilogramos, sino una calificación morfológica relativa a la estatura.

### Métodos de Estimación de Grasa Corporal (Durnin & Womersley vs. Withers)
- **Definición**: Modelos de regresión que estiman la densidad corporal ($D$) a partir de sumatorias de pliegues cutáneos, la cual luego se convierte en porcentaje de grasa corporal mediante la ecuación de **Siri (1961)**.
  - **Durnin & Womersley (1974)**: Utiliza el logaritmo de la suma de 4 pliegues (tríceps, bíceps, subescapular y cresta ilíaca) con coeficientes según sexo y rango etario.
  - **Withers et al. (1987)**: Específico para población atlética; utiliza 7 pliegues en hombres y 6 pliegues en mujeres.
- **Alcance / Propósito**: El nutricionista puede comparar ambos métodos en el detalle de la medición y definir cuál es el método principal (`primaryFatMethod`) que visualizará el paciente en su panel.
- **Lo que NO es**: No son métodos de fraccionamiento anatómico de 5 componentes (Drinkwater-Ross / Kerr), sino modelos bicompartimentales (masa grasa y masa libre de grasa).

### Área Muscular de Brazo (AMB)
- **Definición**: Estimación transversal del área muscular del brazo (en $\text{cm}^2$) calculada según la ecuación de Heymsfield a partir del perímetro de brazo relajado y el pliegue tricipital.
- **Alcance / Propósito**: Indicador regional de seguimiento de masa muscular apendicular entre mediciones.
- **Lo que NO es**: No descuenta el área ósea humeral (corresponde al área muscular total sin corrección ósea de género).

### Aplicación del Nutricionista vs. Vista Web Efímera del Paciente
- **Definición**: Separación clara de responsabilidades según el punto de entrada a la aplicación:
  - **Aplicación del Nutricionista (`/`)**: La PWA instalada o abierta en la raíz está 100% dedicada al trabajo clínico del profesional (gestión de pacientes con PIN autogenerado, carga guiada con Stepper ISAK, previsualización *"Ver como paciente"*, generación de enlaces cifrados y copias de seguridad en `IndexedDB`).
  - **Vista Web Efímera del Paciente (`#import=...`)**: Cuando se accede mediante un enlace compartido, la web presenta una pantalla de desbloqueo por PIN y renderiza exclusivamente el informe interactivo del paciente (Resumen con variables ISAK y notas, Somatocarta y Evolución temporal) en memoria y `sessionStorage`, conservando el hash en la URL sin escribir datos en `IndexedDB`.
- **Alcance / Propósito**: Evita mezclar perfiles en un mismo almacenamiento local y permite al paciente consultar su informe completo directamente desde el enlace enviado por el profesional sin pasos de importación ni controles de nutricionista.
- **Lo que NO es**: No son cuentas autenticadas contra un servidor ni modos conmutables manualmente dentro de la misma sesión local.

### Enlace Compartido Cifrado (`#import=...`)
- **Definición**: URL generada por el nutricionista cuyo fragmento hash (`#`) contiene los datos del paciente, del profesional evaluador y el historial de valores finales de medición cifrados con **AES-GCM (Web Crypto API)** utilizando una clave derivada del PIN de 4 dígitos del paciente mediante PBKDF2.
- **Alcance / Propósito**: Actúa como única fuente de verdad autocontenida para que el paciente visualice su informe antropométrico completo en el navegador (pudiendo guardarlo en favoritos o abrirlo desde WhatsApp en cualquier momento) sin pasar por ningún servidor intermedio y asegurando que el fragmento `#` nunca sea enviado en peticiones HTTP.
- **Lo que NO es**: No es un enlace de sincronización en vivo con una nube ni requiere importar datos en una base de datos local del paciente; cada enlace representa una instantánea autocontenida e inmutable de las mediciones incluidas al momento de generarlo.

### Plantilla de Controles CSV
- **Definición**: Archivo de texto plano delimitado por comas (`.csv`) con las cabeceras estándar del protocolo ISAK Nivel 1 y datos demográficos del paciente (`Paciente`, `Sexo`, `Fecha de Nacimiento`, `Fecha de Medición`, variables antropométricas y notas). Puede generarse de forma **genérica** (en blanco con fila de referencia) o **contextualizada** (pre-completada con la identidad de un paciente específico desde su ficha).
- **Alcance / Propósito**: Brinda una estructura compatible con Excel y Google Sheets para registrar o migrar múltiples mediciones históricas fuera de la aplicación y luego cargarlas por lote.
- **Lo que NO es**: No reemplaza la auditoría de tomas crudas ISAK (Toma 1, 2 y 3) del Stepper en vivo; la plantilla carga directamente los valores finales consolidados.

### Importación Masiva de Controles (Batch CSV)
- **Definición**: Proceso de carga por lote ejecutado 100% en el navegador (Zero-Backend) que interpreta un archivo CSV, valida tipos y rangos ISAK, asocia los controles a pacientes existentes por coincidencia de nombre (o crea automáticamente nuevos pacientes) y descarta controles duplicados para una misma fecha.
- **Alcance / Propósito**: Permite a los profesionales incorporar registros históricos de múltiples visitas o pacientes en una sola operación atómica dentro de `IndexedDB`.
- **Lo que NO es**: No sobreescribe mediciones existentes de la misma fecha ni envía datos a servidores externos.



