import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, Position, LiveUpdateRating, Tier } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type PlayerRatingStats = {
    average: number;
    matches: number;
    stdDev: number;
};

export function calculateAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function calculateStdDev(numbers: number[]): number {
  if (!numbers || numbers.length < 2) return 0;
  const mean = calculateAverage(numbers);
  return Math.sqrt(numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length);
}

export function calculateStats(numbers: number[]): PlayerRatingStats {
  return { average: calculateAverage(numbers), matches: numbers.length, stdDev: calculateStdDev(numbers) };
}

export function calculateRecencyWeightedAverage(
  numbers: number[],
  recentWindow: number = 5,
  recentWeight: number = 2.5,
  decayFactor: number = 0.9
): number {
  if (!numbers || numbers.length === 0) return 0;
  const normalizedWindow = Math.max(1, recentWindow);
  const normalizedDecay = Math.min(Math.max(decayFactor, 0.5), 0.99);
  const windowStart = Math.max(0, numbers.length - normalizedWindow);

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < numbers.length; i++) {
    const distanceFromMostRecent = (numbers.length - 1) - i;
    const recencyWeight = Math.pow(normalizedDecay, distanceFromMostRecent);
    const isRecent = i >= windowStart;
    const finalWeight = recencyWeight * (isRecent ? recentWeight : 1);

    weightedSum += numbers[i] * finalWeight;
    totalWeight += finalWeight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

export function formatAverage(avg: number): string {
  return avg.toFixed(1);
}

export function getAverageColorClass(average: number): string {
  if (average >= 8.5) return 'text-green-400';
  if (average >= 7.5) return 'text-cyan-400';
  if (average >= 6.0) return 'text-yellow-400';
  return 'text-orange-400';
}

export function getTierColorClass(tier: Tier): string {
    switch (tier) {
        case 'S+': return 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]';
        case 'S': return 'text-orange-400';
        case 'A': return 'text-purple-400';
        case 'B': return 'text-sky-400';
        case 'C': return 'text-green-400';
        case 'D': return 'text-muted-foreground';
        default: return 'text-foreground';
    }
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function normalizeStyleName(style: string): string {
    if (!style) return 'Ninguno';
    if (style === 'Señuelo') return 'Segundo delantero';
    return style;
}

export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = { A: 8, B: 4, C: 0, D: -5, E: -10 };

/**
 * Calculates a Tier Score (0-100) and assigns a Tier Letter.
 */
export function calculateTierInfo(
  overallAverage: number, 
  matches: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
  prioritizeRecentForm: boolean = false
): { score: number; tier: Tier } {
  const effectiveRecentAverage = recentAverage ?? overallAverage;
  const recentWeight = prioritizeRecentForm ? 0.7 : 0.3;
  const overallWeight = 1 - recentWeight;
  
  const performanceScore = ((overallAverage * overallWeight) + (effectiveRecentAverage * recentWeight)) * 10;
  let finalScore = performanceScore + (liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0);

  // Confidence adjustment
  if (matches < 3) finalScore *= 0.8;
  else if (matches < 5) finalScore *= 0.9;

  let tier: Tier = 'D';
  if (finalScore >= 90) tier = 'S+';
  else if (finalScore >= 80) tier = 'S';
  else if (finalScore >= 70) tier = 'A';
  else if (finalScore >= 60) tier = 'B';
  else if (finalScore >= 50) tier = 'C';

  return { score: finalScore, tier };
}

export function isSpecialCard(cardName: string): boolean {
  if (!cardName) return false;
  const n = cardName.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm');
}

const MAX_STAT_VALUE = 99;

export const statLabels: Record<string, string> = {
    offensiveAwareness: 'Act. Ofensiva', 
    ballControl: 'Control del Balón', 
    dribbling: 'Regate', 
    tightPossession: 'Posesión Estrecha',
    lowPass: 'Pase Raso', 
    loftedPass: 'Pase Bombeado', 
    finishing: 'Finalización', 
    heading: 'Cabeceo', 
    placeKicking: 'Balón Parado', 
    curl: 'Efecto',
    defensiveAwareness: 'Actitud defensiva', 
    defensiveEngagement: 'Dedicación defensiva', 
    tackling: 'Entrada', 
    aggression: 'Agresividad',
    goalkeeping: 'Act. de Portero', 
    gkCatching: 'Atajar', 
    gkParrying: 'Parada', 
    gkReflexes: 'Reflejos', 
    gkReach: 'Cobertura',
    speed: 'Velocidad', 
    acceleration: 'Aceleración', 
    kickingPower: 'Potencia de Tiro', 
    jump: 'Salto', 
    physicalContact: 'Contacto Físico',
    balance: 'Equilibrio', 
    stamina: 'Resistencia',
    height: 'Altura', 
    weight: 'Peso',
};

export const allStatsKeys: (keyof PlayerAttributeStats)[] = [
    'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl',
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina',
    'goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'
];

export function calculateProgressionStats(baseStats: PlayerAttributeStats, build: PlayerBuild, isGoalkeeper: boolean = false): PlayerAttributeStats {
  const newStats: PlayerAttributeStats = { ...baseStats };
  const getBase = (s: keyof PlayerAttributeStats, b: keyof PlayerAttributeStats) => baseStats[b] !== undefined ? baseStats[b] : baseStats[s] || 0;

  if (!isGoalkeeper) {
    const sP = build.shooting || 0;
    newStats.finishing = Math.min(MAX_STAT_VALUE, getBase('finishing', 'baseFinishing') + sP);
    newStats.placeKicking = Math.min(MAX_STAT_VALUE, getBase('placeKicking', 'basePlaceKicking') + sP);
    newStats.curl = Math.min(MAX_STAT_VALUE, getBase('curl', 'baseCurl') + sP);
    const pP = build.passing || 0;
    newStats.lowPass = Math.min(MAX_STAT_VALUE, getBase('lowPass', 'baseLowPass') + pP);
    newStats.loftedPass = Math.min(MAX_STAT_VALUE, getBase('loftedPass', 'baseLoftedPass') + pP);
    const dP = build.dribbling || 0;
    newStats.ballControl = Math.min(MAX_STAT_VALUE, getBase('ballControl', 'baseBallControl') + dP);
    newStats.dribbling = Math.min(MAX_STAT_VALUE, getBase('dribbling', 'baseDribbling') + dP);
    newStats.tightPossession = Math.min(MAX_STAT_VALUE, getBase('tightPossession', 'baseTightPossession') + dP);
    const dxP = build.dexterity || 0;
    newStats.offensiveAwareness = Math.min(MAX_STAT_VALUE, getBase('offensiveAwareness', 'baseOffensiveAwareness') + dxP);
    newStats.acceleration = Math.min(MAX_STAT_VALUE, getBase('acceleration', 'baseAcceleration') + dxP);
    newStats.balance = Math.min(MAX_STAT_VALUE, getBase('balance', 'baseBalance') + dxP);
    const lbP = build.lowerBodyStrength || 0;
    newStats.speed = Math.min(MAX_STAT_VALUE, getBase('speed', 'baseSpeed') + lbP);
    newStats.kickingPower = Math.min(MAX_STAT_VALUE, getBase('kickingPower', 'baseKickingPower') + lbP);
    newStats.stamina = Math.min(MAX_STAT_VALUE, getBase('stamina', 'baseStamina') + lbP);
    const aP = build.aerialStrength || 0;
    newStats.heading = Math.min(MAX_STAT_VALUE, getBase('heading', 'baseHeading') + aP);
    newStats.jump = Math.min(MAX_STAT_VALUE, getBase('jump', 'baseJump') + aP);
    newStats.physicalContact = Math.min(MAX_STAT_VALUE, getBase('physicalContact', 'basePhysicalContact') + aP);
    const dfP = build.defending || 0;
    newStats.defensiveAwareness = Math.min(MAX_STAT_VALUE, getBase('defensiveAwareness', 'baseDefensiveAwareness') + dfP);
    newStats.defensiveEngagement = Math.min(MAX_STAT_VALUE, getBase('defensiveEngagement', 'baseDefensiveEngagement') + dfP);
    newStats.tackling = Math.min(MAX_STAT_VALUE, getBase('tackling', 'baseTackling') + dfP);
    newStats.aggression = Math.min(MAX_STAT_VALUE, getBase('aggression', 'baseAggression') + dfP);
  } else {
    const gk1 = build.gk1 || 0;
    newStats.goalkeeping = Math.min(MAX_STAT_VALUE, getBase('goalkeeping', 'baseGoalkeeping') + gk1);
    newStats.jump = Math.min(MAX_STAT_VALUE, getBase('jump', 'baseJump') + gk1);
    const gk2 = build.gk2 || 0;
    newStats.gkParrying = Math.min(MAX_STAT_VALUE, getBase('gkParrying', 'baseGkParrying') + gk2);
    newStats.gkReach = Math.min(MAX_STAT_VALUE, getBase('gkReach', 'baseGkReach') + gk2);
    const gk3 = build.gk3 || 0;
    newStats.gkCatching = Math.min(MAX_STAT_VALUE, getBase('gkCatching', 'baseGkCatching') + gk3);
    newStats.gkReflexes = Math.min(MAX_STAT_VALUE, getBase('gkReflexes', 'baseGkReflexes') + gk3);
  }
  return newStats;
}

export const symmetricalPositionMap: Record<Position, Position> = {
  PT: 'PT',
  DFC: 'DFC',
  LI: 'LD',
  LD: 'LI',
  MCD: 'MCD',
  MC: 'MC',
  MDI: 'MDD',
  MDD: 'MDI',
  MO: 'MO',
  EXI: 'EXD',
  EXD: 'EXI',
  SD: 'SD',
  DC: 'DC',
};