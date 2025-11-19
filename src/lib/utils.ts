
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position, PositionGroup, PlayerStyle, PlayerRatingStats, PlayerStatsBuild, PlayerAttribute, StatGroup } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return sum / numbers.length;
}

export function calculateStdDev(numbers: number[]): number {
  if (!numbers || numbers.length < 2) return 0;
  const n = numbers.length;
  const mean = calculateAverage(numbers);
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

export function calculateStats(numbers: number[]): PlayerRatingStats {
  const average = calculateAverage(numbers);
  const stdDev = calculateStdDev(numbers);
  const matches = numbers.length;
  return { average, matches, stdDev };
}


export function formatAverage(avg: number): string {
  return avg.toFixed(1);
}

export function getPositionGroup(position: Position): PositionGroup {
  switch (position) {
    case 'PT':
      return 'Goalkeeper';
    case 'DFC':
    case 'LI':
    case 'LD':
      return 'Defender';
    case 'MCD':
    case 'MC':
    case 'MDI':
    case 'MDD':
    case 'MO':
      return 'Midfielder';
    case 'EXI':
    case 'EXD':
    case 'SD':
    case 'DC':
      return 'Forward';
  }
}

export function getPositionGroupColor(position: Position): string {
  const group = getPositionGroup(position);
  switch (group) {
    case 'Goalkeeper':
      return '#FAC748'; // Yellow
    case 'Defender':
      return '#57A6FF'; // Blue
    case 'Midfielder':
      return '#5DD972'; // Green
    case 'Forward':
      return '#FF6B6B'; // Red
    default:
      return 'hsl(var(--primary))';
  }
}

export function getAverageColorClass(average: number): string {
  if (average >= 8.5) return 'text-green-400';
  if (average >= 7.5) return 'text-cyan-400';
  if (average >= 6.0) return 'text-yellow-400';
  return 'text-orange-400';
}

export function getAvailableStylesForPosition(position: Position, includeNinguno = false): PlayerStyle[] {
    const baseStyles: PlayerStyle[] = includeNinguno ? ['Ninguno'] : [];

    const gkStyles: PlayerStyle[] = ['Portero defensivo', 'Portero ofensivo'];
    const fbStyles: PlayerStyle[] = ['Lateral defensivo', 'Lateral Ofensivo', 'Lateral finalizador'];
    const dfcStyles: PlayerStyle[] = ['El destructor', 'Creador de juego', 'Atacante extra'];
    const mcdStyles: PlayerStyle[] = ['Omnipresente', 'Medio escudo', 'Organizador', 'El destructor'];
    const mcStyles: PlayerStyle[] = ['Jugador de huecos', 'Omnipresente', 'Medio escudo', 'El destructor', 'Organizador', 'Creador de jugadas'];
    const mdiMddStyles: PlayerStyle[] = ['Omnipresente', 'Jugador de huecos', 'Especialista en centros', 'Extremo móvil', 'Creador de jugadas'];
    const moStyles: PlayerStyle[] = ['Creador de jugadas', 'Diez Clasico', 'Jugador de huecos', 'Señuelo'];
    const sdStyles: PlayerStyle[] = ['Segundo delantero', 'Creador de jugadas', 'Diez Clasico', 'Jugador de huecos', 'Señuelo'];
    const wingerStyles: PlayerStyle[] = ['Creador de jugadas', 'Extremo prolífico', 'Extremo móvil', 'Especialista en centros'];
    const dcStyles: PlayerStyle[] = ['Cazagoles', 'Señuelo', 'Hombre de área', 'Hombre objetivo', 'Segundo delantero'];

    if (position === 'PT') return [...baseStyles, ...gkStyles];
    if (position === 'LI' || position === 'LD') return [...baseStyles, ...fbStyles];
    if (position === 'DFC') return [...baseStyles, ...dfcStyles];
    if (position === 'MCD') return [...baseStyles, ...mcdStyles];
    if (position === 'MC') return [...baseStyles, ...mcStyles];
    if (position === 'MDI' || position === 'MDD') return [...baseStyles, ...mdiMddStyles];
    if (position === 'MO') return [...baseStyles, ...moStyles];
    if (position === 'SD') return [...baseStyles, ...sdStyles];
    if (position === 'EXI' || position === 'EXD') return [...baseStyles, ...wingerStyles];
    if (position === 'DC') return [...baseStyles, ...dcStyles];
    
    return baseStyles;
}


export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/([A-Z])/g, ' $1');
}

export const statGroups: Record<StatGroup, readonly PlayerAttribute[]> = {
    Shooting: ["finishing", "setPieceTaking", "curl"],
    Passing: ["lowPass", "loftedPass"],
    Dribbling: ["ballControl", "dribbling", "tightPossession"],
    Dexterity: ["offensiveAwareness", "acceleration", "balance"],
    "Lower Body Strength": ["speed", "kickingPower", "stamina"],
    "Aerial Strength": ["heading", "jump", "physicalContact"],
    Goalkeeping: ["gkAwareness", "gkCatching", "gkClearing", "gkReflexes", "gkReach"],
};

export const groupPriorities: Partial<Record<Position, { group: StatGroup, weight: number }[]>> = {
    DC: [
        { group: 'Lower Body Strength', weight: 6 },
        { group: 'Shooting', weight: 5 },
        { group: 'Dexterity', weight: 4 },
        { group: 'Dribbling', weight: 3 },
        { group: 'Aerial Strength', weight: 2 },
        { group: 'Passing', weight: 1 },
    ],
    // Priorities for other positions can be added here
};


export function getAffinityScoreForPosition(position: Position, build: PlayerStatsBuild, idealBuild?: Partial<Record<PlayerAttribute, number>>): number {
    if (!idealBuild || Object.keys(idealBuild).length === 0) {
        return 0;
    }

    const priorities = groupPriorities[position];
    if (!priorities) return 0; // No priorities defined for this position

    const groupScores: { score: number, weight: number }[] = [];
    const totalWeight = priorities.reduce((sum, p) => sum + p.weight, 0);

    priorities.forEach(({ group, weight }) => {
        const statsInGroup = statGroups[group];
        const groupStatScores: number[] = [];

        statsInGroup.forEach(stat => {
            const idealValue = idealBuild[stat];
            if (idealValue === undefined) return; // This stat is not in the ideal build for this position

            if (build.stats?.[stat] === undefined || build.stats?.[stat] === null) {
                // Heavily penalize if a stat is missing entirely
                groupStatScores.push(0);
                return;
            }
            
            const playerValue = build.stats[stat]!;

            if (playerValue >= idealValue) {
                groupStatScores.push(100);
            } else {
                const diff = idealValue - playerValue;
                const statScore = Math.max(0, 100 - (diff * 2));
                groupStatScores.push(statScore);
            }
        });
        
        if (groupStatScores.length > 0) {
            const groupAverage = groupStatScores.reduce((sum, score) => sum + score, 0) / groupStatScores.length;
            groupScores.push({ score: groupAverage, weight });
        }
    });

    if (groupScores.length === 0 || totalWeight === 0) {
        return 0;
    }

    const weightedScore = groupScores.reduce((sum, { score, weight }) => sum + (score * weight), 0) / totalWeight;
    return weightedScore;
}


export function getRelevantAttributesForPosition(position: Position): PlayerAttribute[] {
    const priorities = groupPriorities[position];
    if (!priorities) return [];

    // Get all stats from the prioritized groups
    const attributes = priorities.flatMap(({ group }) => statGroups[group]);
    
    // Return a unique set of attributes
    return [...new Set(attributes)];
}
