# 0002: Dedicación Exclusiva de la App al Nutricionista y Vista Web Efímera por Enlace para el Paciente

- **Fecha**: 2026-10-13
- **Estado**: Aceptada

## Contexto y Problema
En la versión inicial de **AntropoPopo**, la aplicación ofrecía un selector manual `Nutri | Paciente` en el encabezado principal y persistía ambos roles sobre la misma base de datos local `IndexedDB` (`AntropoPopoDB`). Cuando el paciente abría un enlace compartido (`#import=...`) e ingresaba su PIN:
1. Los datos descifrados se guardaban en `IndexedDB` y se borraba el hash `#import=...` de la URL (`history.replaceState`).
2. El encabezado seguía mostrando el selector `Nutri | Paciente`, exponiendo al paciente una interfaz de carga profesional vacía o confusa si cambiaba de modo, y resultando innecesario para el nutricionista que sólo desea previsualizar cómo verá el informe su paciente.
3. Si el paciente volvía a abrir el enlace o recargaba sin almacenamiento persistente, o si abría el enlace en un navegador embebido (ej. WhatsApp/Instagram), guardar en `IndexedDB` y limpiar la URL hacía que el enlace dejara de ser reutilizable o marcable en favoritos.

Adicionalmente, el formulario de creación de pacientes inicializaba el PIN por defecto en `'1234'`, lo que en la práctica llevaba a que múltiples pacientes conservaran una clave predecible.

## Alternativas Evaluadas
1. **Mantener el doble modo persistente (`Nutri | Paciente`) en `IndexedDB` y sólo ocultar el botón en ciertos casos**:
   - *Ventajas*: Cambios mínimos en el flujo actual.
   - *Desventajas*: Mantiene acoplamiento innecesario en `IndexedDB`, confusión de roles en la interfaz y destruye el hash de la URL al importar, impidiendo que el link compartido funcione como un documento web autocontenido.
2. **Separar en dos aplicaciones o rutas estáticas distintas (`/nutri` y `/paciente`)**:
   - *Ventajas*: Separación física de puntos de entrada.
   - *Desventajas*: Complica el ruteo en GitHub Pages / PWA offline sin aportar beneficios adicionales frente a detectar la presencia del fragmento `#import=...`.
3. **Dedicar la PWA raíz (`/`) 100% al nutricionista y tratar `#import=...` como una Vista Web Efímera en memoria (`sessionStorage`) + previsualización integrada**:
   - *Ventajas*:
     - La PWA instalada por el profesional queda 100% enfocada en su flujo clínico, con una opción directa *"Ver como paciente"* dentro del detalle de cada medición.
     - Para el paciente, el enlace `#import=...` + PIN funciona como única fuente de verdad autocontenida: conserva el hash en la URL (permitiendo recargar o guardar en favoritos), cachea el payload descifrado sólo en `sessionStorage` mientras dure la pestaña abierta y nunca contamina ni depende de `IndexedDB`.
     - La autogeneración de un PIN aleatorio de 4 dígitos al crear cada paciente elimina el uso accidental de `'1234'`.
   - *Desventajas*: Si el paciente cierra la pestaña y vuelve a abrir el enlace más tarde, deberá volver a ingresar su PIN de 4 dígitos (comportamiento esperado y deseable en un informe clínico protegido).

## Decisión Adoptada
Se adopta la **Alternativa 3**:
1. Eliminar el selector `Nutri | Paciente` del encabezado y el estado `antropopopo_app_mode` en `localStorage`.
2. Renderizar la vista del paciente exclusivamente cuando:
   - Exista un token `#import=...` en la URL (descifrado en memoria y cacheado en `sessionStorage` bajo ese token, conservando el hash en la URL y sin tocar `IndexedDB`), o
   - El nutricionista active la previsualización **"Ver como paciente"** desde `MeasurementDetail`.
3. Enriquecer `PatientDashboard` con la tabla completa de variables ISAK medidas y las notas de la consulta seleccionada.
4. Generar automáticamente un PIN aleatorio de 4 dígitos (`1000`–`9999`, distinto de `1234`) al dar de alta un nuevo paciente en `PatientModal`.
5. Eliminar la carga automática de datos semilla de muestra (`Francis Holway` y paciente ficticio) en `IndexedDB`, solicitando en su lugar un onboarding inicial obligatorio (`OnboardingView`) donde el profesional configura su perfil (o restaura un backup `.json`) antes de cargar a su primer paciente.

## Consecuencias y Trade-offs
- **Simplicidad operativa y sin datos ficticios**: El nutricionista inicia con una base limpia configurada a su nombre y gestiona pacientes reales sin tener que borrar registros de ejemplo ni correr riesgo de emitir informes con el nombre de otro profesional.
- **Enlaces inmutables y reutilizables**: El paciente puede abrir su enlace desde WhatsApp cuantas veces quiera sin depender del almacenamiento local del navegador ni ver controles del modo profesional.
- **Privacidad reforzada**: Los datos del paciente abierto por link residen únicamente en la memoria de la pestaña activa (`sessionStorage`) y cada paciente nuevo recibe un PIN aleatorio único por defecto.

