# Cambiar Rating de Rol numérico a Tier List (S/A/B/C/D)

Reemplazar el `roleRating` numérico (0-100) por un sistema de tiers (S, A, B, C, D) en toda la UI. Agregar un modo "Liga" vs "Evento" al 11 ideal: en Liga solo jugadores tier S o A son seleccionables; en Evento cualquier tier es válido.

## Propuesta de Rangos

| Tier | Rango roleRating | Color |
|------|-------------------|-------|
| S | ≥ 90 | 🟠 Naranja/dorado |
| A | ≥ 75 | 🟣 Púrpura |
| B | ≥ 60 | 🔵 Celeste |
| C | ≥ 40 | 🟢 Verde |
| D | < 40 | ⚪ Gris |

> [!IMPORTANT]
> Los rangos de arriba son una propuesta. Si preferís otros valores, avisame.

## Proposed Changes

### Utilidades ([utils.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/utils.ts))

#### [MODIFY] [utils.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/utils.ts)
- Agregar tipo `RoleTier = 'S' | 'A' | 'B' | 'C' | 'D'`
- Agregar función `roleRatingToTier(roleRating: number): RoleTier`
- Agregar función `getTierColorClass(tier: RoleTier): string` para los colores de cada tier
- La función [calculateRoleRating()](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/utils.ts#89-169) sigue devolviendo un número; la conversión a tier es puramente de presentación

---

### Tipos ([types.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/types.ts))

#### [MODIFY] [types.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/types.ts)
- Exportar `RoleTier` desde utils (o definirlo aquí)

---

### Generador de 11 Ideal ([team-generator.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/team-generator.ts))

#### [MODIFY] [team-generator.ts](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/team-generator.ts)
- Agregar parámetro `teamMode: 'liga' | 'evento'` a [generateIdealTeam()](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/team-generator.ts#16-208)
- En modo `'liga'`: filtrar candidatos para que solo pasen los que tengan tier S o A (roleRating ≥ 75)
- En modo `'evento'`: sin filtro adicional (actual comportamiento)

---

### Setup del 11 Ideal ([ideal-team-setup.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/ideal-team-setup.tsx))

#### [MODIFY] [ideal-team-setup.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/ideal-team-setup.tsx)
- Agregar prop `teamMode: 'liga' | 'evento'` y `onTeamModeChange`
- Agregar un selector (Select) "Modo: Liga / Evento" en la UI

---

### Página principal ([page.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/app/page.tsx))

#### [MODIFY] [page.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/app/page.tsx)
- Agregar estado `teamMode` (`'liga' | 'evento'`), default `'liga'`
- Pasar `teamMode` al [IdealTeamSetup](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/ideal-team-setup.tsx#11-28) y al [generateIdealTeam()](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/lib/team-generator.ts#16-208)

---

### Tabla de jugadores ([player-table.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-table.tsx))

#### [MODIFY] [player-table.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-table.tsx)
- Cambiar display de `{roleRating.toFixed(0)} / 100` → Badge con la letra del tier y color correspondiente (ej: "S", "A")

---

### Probador de jugadores ([player-tester.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-tester.tsx))

#### [MODIFY] [player-tester.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-tester.tsx)
- Cambiar display del número grande → Badge/letra del tier con color

---

### Detalle de jugador ([player-detail-dialog.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-detail-dialog.tsx))

#### [MODIFY] [player-detail-dialog.tsx](file:///c:/Users/maxim/Desktop/eFootTrackerV2/src/components/player-detail-dialog.tsx)
- Cambiar badge `Rol: {flatPlayer.roleRating.toFixed(0)}` → `Tier: S` (con color)

---

## Verification Plan

### Manual Verification
1. Abrir la app en el navegador
2. Ir a cualquier pestaña de posición (ej: DC) y verificar que la columna "Rating Rol" muestra letras (S/A/B/C/D) con colores en vez de números
3. Ir al Probador de Jugadores, calcular un rating y verificar que muestra tier
4. Abrir la ficha de un jugador y verificar que el badge de rol muestra tier
5. Ir al 11 Ideal, verificar que aparece el selector "Modo: Liga / Evento"
6. En modo Liga: generar equipo y verificar que solo aparecen jugadores con tier S o A
7. En modo Evento: generar equipo y verificar que aparecen jugadores de cualquier tier
