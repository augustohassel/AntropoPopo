# Glosario de Dominio - AntropoPopo

Este documento registra la jerga funcional, entidades de negocio y conceptos antropométricos utilizados en **AntropoPopo**. Debe actualizarse en tiempo real cada vez que se introduzca, aclare o redefina un término del dominio.

---

### Protocolo ISAK Nivel 1 (Perfil Restringido)
- **Definición**: Conjunto estandarizado de 17 variables antropométricas definido por la *International Society for the Advancement of Kinanthropometry* (ISAK), compuesto por 2 medidas básicas (peso y talla), 2 diámetros óseos (humeral y femoral), 5 perímetros (brazo relajado, brazo flexionado en tensión, cintura mínima, cadera máxima y pantorrilla máxima) y 8 pliegues cutáneos (tríceps, subescapular, bíceps, cresta ilíaca, supraespinal, abdominal, muslo medial y pantorrilla).
- **Alcance / Propósito**: Constituye el catálogo completo de variables que el nutricionista releva en una consulta dentro de la aplicación y a partir del cual se calculan todos los indicadores de composición corporal y somatotipo.
- **Lo que NO es**: No incluye las variables adicionales del Perfil Completo (ISAK Nivel 2).

### Toma (Take) y Valor Final (Final)
- **Definición**: Una **Toma** es cada medición individual registrada por el profesional para una variable durante la sesión. El **Valor Final** es el valor consolidado de esa variable que se utiliza en las fórmulas antropométricas.
- **Alcance / Propósito**: Siguiendo la normativa ISAK, se exigen 2 tomas iniciales por variable. Si la diferencia relativa entre ambas supera la tolerancia permitida ($> 5\%$ en pliegues cutáneos o $> 1\%$ en datos básicos, diámetros y perímetros), se solicita una 3ra toma de desempate. El Valor Final se calcula como el **promedio** cuando hay 2 tomas o la **mediana** cuando hay 3 tomas.
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

### Modo Nutricionista (`nutri`) vs. Modo Paciente (`patient`)
- **Definición**: Los dos modos operativos de la aplicación dentro del navegador local.
  - **Modo Nutricionista**: Permite gestionar múltiples fichas de pacientes, cargar mediciones con el Stepper ISAK, configurar datos profesionales, realizar copias de seguridad y generar enlaces cifrados.
  - **Modo Paciente**: Vista de lectura e historial personal donde el paciente importa sus mediciones mediante enlace + PIN y consulta su evolución temporal.
- **Alcance / Propósito**: Adapta la interfaz y las acciones disponibles según el rol del usuario en su propio dispositivo, manteniendo una única base de código PWA.
- **Lo que NO es**: No son cuentas de usuario autenticadas contra un servidor; ambos modos operan 100% en el IndexedDB local del dispositivo donde se abren.

### Enlace Compartido Cifrado (`#import=...`)
- **Definición**: URL generada por el nutricionista cuyo fragmento hash (`#`) contiene los datos del paciente y sus valores finales de medición empaquetados de forma posicional, comprimidos y cifrados con **AES-GCM (Web Crypto API)** utilizando una clave derivada del PIN del paciente mediante PBKDF2.
- **Alcance / Propósito**: Habilita la transferencia segura de datos cliente-a-cliente (por WhatsApp, correo, etc.) sin pasar por ningún servidor intermedio y asegurando que el fragmento `#` nunca sea enviado en peticiones HTTP.
- **Lo que NO es**: No es un enlace de sincronización en vivo con una nube; cada enlace representa una instantánea inmutable de las mediciones incluidas al momento de generarlo.

