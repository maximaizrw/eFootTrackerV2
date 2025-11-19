
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position, PositionGroup, PlayerStyle, PlayerRatingStats, PlayerStatsBuild, PlayerAttribute } from "./types";
import { playerAttributes } from "./types";

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
    .replace(/[^a-z0-9]/g, '');
}

export const affinityConfig: Record<Position, PlayerAttribute[]> = {
    PT: ["gkAwareness", "gkCatching", "gkClearing", "gkReflexes", "gkReach", "jump"],
    DFC: ["heading", "jump", "physicalContact", "defensiveAwareness", "tackling", "defensiveEngagement", "speed", "acceleration"],
    LI: ["speed", "acceleration", "stamina", "lowPass", "curl", "defensiveAwareness", "tackling", "defensiveEngagement"],
    LD: ["speed", "acceleration", "stamina", "lowPass", "curl", "defensiveAwareness", "tackling", "defensiveEngagement"],
    MCD: ["lowPass", "loftedPass", "stamina", "physicalContact", "defensiveAwareness", "tackling", "defensiveEngagement", "ballControl"],
    MC: ["ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass", "stamina", "balance", "offensiveAwareness"],
    MDI: ["ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass", "speed", "acceleration", "stamina", "curl"],
    MDD: ["ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass", "speed", "acceleration", "stamina", "curl"],
    MO: ["offensiveAwareness", "ballControl", "dribbling", "tightPossession", "lowPass", "finishing", "kickingPower", "acceleration"],
    EXI: ["speed", "acceleration", "dribbling", "tightPossession", "ballControl", "curl", "lowPass", "finishing"],
    EXD: ["speed", "acceleration", "dribbling", "tightPossession", "ballControl", "curl", "lowPass", "finishing"],
    SD: ["offensiveAwareness", "finishing", "ballControl", "dribbling", "tightPossession", "kickingPower", "speed", "acceleration"],
    DC: ["finishing", "lowPass", "ballControl", "dribbling", "tightPossession", "offensiveAwareness", "acceleration", "balance", "speed", "kickingPower", "stamina", "heading", "jump", "physicalContact"],
};

export function getAffinityScoreForPosition(position: Position, build: PlayerStatsBuild): number {
    const relevantStats = affinityConfig[position];
    if (!relevantStats || !build) {
        return 0;
    }
    
    const score = relevantStats.reduce((total, stat) => {
        return total + (build[stat] || 0);
    }, 0);
    
    return score;
}

export function getRelevantAttributesForPosition(position: Position): PlayerAttribute[] {
    return affinityConfig[position] || [];
}
