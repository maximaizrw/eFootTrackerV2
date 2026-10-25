# AGENTS.md — eFootTrackerV2

Aplicación web para gestionar jugadores, cartas, valoraciones, formaciones y resultados de partidos de eFootball. También permite generar equipos ideales según posiciones, estilos, tiers, filtros y criterios de selección.

## Stack y estructura

- Next.js `15.3.8` con React `18.3.1` y TypeScript.
- Tailwind CSS `3.4.1` para estilos, junto con componentes Radix UI, `lucide-react` y `recharts`.
- Firebase `11.9.1`: Firestore para datos persistentes y Storage para recursos como imágenes.
- `src/app/`: entrada de la aplicación, layout, estilos globales y rutas API.
- `src/components/`: componentes de la interfaz y diálogos para jugadores, cartas, valoraciones, formaciones y partidos.
- `src/components/ui/`: componentes reutilizables basados en Radix UI.
- `src/hooks/`: acceso y operaciones sobre jugadores y formaciones.
- `src/lib/`: tipos, configuración de Firebase, utilidades, presets, plantillas y algoritmo de generación del equipo ideal.
- `@/*` apunta a `src/*`; conserva este alias al importar código del proyecto.

## Comandos

Ejecutar desde la raíz del proyecto:

- Desarrollo: `npm run dev` (servidor en el puerto `9002`).
- Lint: `npm run lint`.
- Comprobación de tipos: `npm run typecheck`.
- Compilación de producción: `npm run build`.
- Ejecutar la compilación: `npm run start`.

No hay un script `test` configurado en `package.json`. Los tests existentes usan `node:test` y cubren principalmente la lógica de `src/lib/team-generator.ts`.

## Convenciones

- Usa TypeScript estricto y componentes React funcionales.
- Mantén los textos visibles de la interfaz en español.
- Usa nombres descriptivos y comentarios solo cuando expliquen una decisión o regla de dominio.
- Mantén la lógica de acceso a datos en hooks y la lógica reutilizable en `src/lib`.
- Sigue los componentes y patrones existentes antes de crear variantes nuevas; reutiliza `src/components/ui` cuando corresponda.
- Conserva el alias de imports `@/` y el estilo de formato del archivo que estés modificando.

## Reglas de dominio / trampas conocidas

- Firebase/Firestore es la fuente persistente de jugadores y formaciones. Mantén compatibilidad con los documentos ya guardados.
- Las posiciones pueden tener estilos ofensivos y defensivos distintos. Las formaciones fluidas tienen requisitos para sus dos fases y deben evaluarse en la posición correspondiente.
- Respeta la lógica de tiers, excepciones, jugadores alternativos, descartes manuales y ausencia de duplicados del generador de equipos ideales.
- Al guardar formaciones, no envíes valores `undefined` a Firestore; sanitiza los slots y conserva solo propiedades definidas.
- Mantén el formato actual de los backups, que agrupa los datos de jugadores y formaciones en el archivo `eFootTracker_backup.json`.
- No cambies silenciosamente nombres de campos, colecciones ni la forma de los datos persistidos.
- Las credenciales de Firebase llegan mediante variables `NEXT_PUBLIC_FIREBASE_*`; no hardcodees secretos ni modifiques la configuración sensible sin indicación.

## Forma de trabajar

- Antes de tocar código, revisa los tipos, hooks y utilidades relacionados con el cambio y define cómo comprobarás el resultado.
- Haz solo lo pedido y mantén los cambios pequeños y enfocados.
- No reescribas ni refactorices código adyacente que no sea necesario para la solicitud.
- Si una decisión puede romper datos existentes, cambiar el comportamiento del dominio o requerir una dependencia, detente y explícalo antes de implementarla.
- Al terminar, resume qué cambió, qué verificaciones se ejecutaron y cualquier decisión que deba revisar el usuario.

## Límites

- ✅ Siempre: mantener los textos en español, respetar las reglas de posiciones, estilos, tiers y formaciones fluidas, y conservar la compatibilidad con los datos existentes.
- ⚠️ Pregunta antes: añadir dependencias o frameworks, crear archivos nuevos, cambiar el formato de datos persistidos, modificar colecciones/campos de Firestore o cambiar la configuración sensible de Firebase.
- 🚫 Nunca: añadir un paso de build no existente, sustituir Firebase sin pedirlo, borrar datos persistidos como parte de una corrección, ni ocultar errores de tipos o lint para hacer pasar una verificación.

## Verificación

- Ejecuta `npm run typecheck`, `npm run lint` y `npm run build` cuando el cambio afecte al código de la aplicación.
- Ejecuta los tests de `src/lib/team-generator.test.ts` con el runner y la configuración disponibles si el cambio afecta al generador o a sus reglas.
- Prueba manualmente los flujos afectados en el servidor de desarrollo: carga de datos, edición/alta, generación del equipo ideal, formaciones fluidas, resultados y descarga de backup.
- Revisa `git diff -- AGENTS.md` y `git status --short` para confirmar que solo se modificaron los archivos previstos.
