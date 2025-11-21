
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position, PositionGroup, PlayerStyle, PlayerRatingStats, PlayerStatsBuild, PlayerAttribute, IdealBuilds } from "./types";
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
    .replace(/([A-Z])/g, ' $1');
}


export function getAffinityScoreFromBuild(
  playerBuild: PlayerStatsBuild | undefined,
  position: Position,
  style: PlayerStyle,
  idealBuilds: IdealBuilds
): number {
  // Find the specific ideal build for the position and style. Fallback to 'Ninguno' if the specific style is not defined.
  const idealBuild = idealBuilds[position]?.[style] || idealBuilds[position]?.['Ninguno'];

  if (!playerBuild || !idealBuild) {
    return 0;
  }

  let totalScore = 0;

  for (const attr of playerAttributes) {
    const playerStat = playerBuild[attr];
    const idealStat = idealBuild[attr];

    if (playerStat === undefined || idealStat === undefined || idealStat === 0) {
      continue;
    }
    
    const diff = playerStat - idealStat;
    
    if (diff >= 5) {
      totalScore += Math.floor(diff / 5) * 0.25;
    } else if (diff <= -5) {
      const blocks = Math.floor(Math.abs(diff) / 5);
      totalScore += diff * (1 + 0.25 * blocks);
    }
  }
  
  const finalScore = 100 + totalScore;
  return Math.max(0, Math.min(100, finalScore));
}

export function calculateGeneralScore(affinityScore: number, average: number): number {
  const matchAverageScore = average > 0 ? (average / 10) * 100 : 0;
  return (affinityScore * 0.6) + (matchAverageScore * 0.4);
}
  
