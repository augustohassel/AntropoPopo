# 0001: Aislamiento de Web Origin mediante Subdominio Propio (`antropo.hasselpunk.com`) y Hardening de PWA Manifest

- **Fecha**: 2026-10-13
- **Estado**: Aceptada

## Contexto y Problema
Originalmente, **AntropoPopo** y otras aplicaciones hermanas (como `RatingsApp`) se desplegaban en GitHub Pages bajo subrutas de un mismo dominio personalizado (`https://www.hasselpunk.com/AntropoPopo/` y `https://www.hasselpunk.com/RatingsApp/`).

Al tratarse de aplicaciones *Zero-Backend* 100% locales que dependen de **IndexedDB** (`Dexie.js`), **Service Workers** y empaquetado como **PWA instalable**, compartir el mismo *Web Origin* (`https://www.hasselpunk.com`) ocasionaba dos problemas críticos en dispositivos móviles:
1. **Colisión de instalación PWA (WebAPK / iOS)**: Cuando una de las aplicaciones ya estaba instalada en el teléfono, el navegador/sistema operativo detectaba que pertenecía al mismo dominio raíz (especialmente sin un `id` y `scope` diferenciados ni íconos PNG dedicados) e impedía instalar la segunda como aplicación independiente.
2. **Almacenamiento local compartido (`IndexedDB`, `localStorage`, `CacheStorage`)**: Los navegadores aíslan el almacenamiento por *Web Origin* (`esquema + host + puerto`), **no por ruta (`pathname`)**. Al compartir `https://www.hasselpunk.com`, todas las subrutas compartían la misma cuota de almacenamiento y la acción del usuario de *"Borrar datos del sitio"* en una aplicación eliminaba irreversiblemente la base de datos clínica local (`AntropoPopoDB`) de la otra.

## Alternativas Evaluadas
1. **Mantener subrutas en el mismo dominio (`www.hasselpunk.com/AntropoPopo/`) ajustando sólo `id` y `scope` en el Manifest**:
   - *Ventajas*: No requiere cambios de DNS ni archivo `CNAME` en el repositorio.
   - *Desventajas*: Aunque mitiga parcialmente la colisión de instalación si los manifests e íconos PNG están bien formados, **no resuelve el aislamiento de `IndexedDB` ni de `CacheStorage`**, manteniendo el riesgo de pérdida de datos clínicos al limpiar datos de cualquiera de las apps del dominio.
2. **Migrar el hosting a buckets en Google Cloud Storage + Cloud CDN**:
   - *Ventajas*: Control granular de cabeceras e infraestructura cloud.
   - *Desventajas*: Para archivos estáticos puros no aporta ningún beneficio en el cliente respecto al aislamiento de *Origin* (que sigue dependiendo del dominio/subdominio) e introduce costos operativos, configuración de certificados SSL, facturación e IAM innecesarios frente a GitHub Pages.
3. **Asignar un subdominio propio (`antropo.hasselpunk.com`) sobre GitHub Pages + Hardening del PWA Manifest**:
   - *Ventajas*: Cada subdominio constituye un *Web Origin* completamente independiente para el navegador (`https://antropo.hasselpunk.com`), aislando al 100% `IndexedDB`, `localStorage`, `CacheStorage`, permisos y el ciclo de vida del Service Worker e instalación WebAPK, manteniendo el despliegue gratuito y automatizado con GitHub Actions + GitHub Pages.
   - *Desventajas*: Requiere dar de alta un registro `CNAME` en el proveedor DNS y realizar una migración única de backup JSON si había datos cargados en el dominio anterior.

## Decisión Adoptada
Se adopta la **Alternativa 3**:
1. Servir **AntropoPopo** en su propio subdominio **`https://antropo.hasselpunk.com/`** incluyendo `public/CNAME` en el build y configurando `base: process.env.VITE_BASE_PATH || '/'` en `vite.config.ts`.
2. Reforzar el `manifest.webmanifest` declarando explícitamente `id: '/'`, `scope: '/'`, `start_url: '/'` e incorporando los íconos rasterizados PNG requeridos por Android WebAPK e iOS (`pwa-192x192.png`, `pwa-512x512.png` y `apple-touch-icon.png`).

### Configuración DNS Requerida
En el proveedor DNS de `hasselpunk.com`, registrar:
- **Tipo**: `CNAME`
- **Nombre / Host**: `antropo`
- **Destino / Target**: `augustohassel.github.io`
- En *GitHub Repository Settings -> Pages*, verificar `Custom domain: antropo.hasselpunk.com` y activar `Enforce HTTPS`.

## Consecuencias y Trade-offs
- **Aislamiento total de datos y PWA**: `AntropoPopoDB` y su Service Worker quedan blindados en `https://antropo.hasselpunk.com`, permitiendo instalar múltiples PWAs del ecosistema `hasselpunk.com` en el mismo dispositivo sin colisiones.
- **Migración de datos existentes**: Dado que `IndexedDB` está atado al *Origin*, cualquier dato cargado previamente bajo `www.hasselpunk.com/AntropoPopo` debe exportarse desde **Ajustes -> Exportar Backup (.json)** antes del cambio y restaurarse mediante **Importar Backup** al abrir `https://antropo.hasselpunk.com/`.

