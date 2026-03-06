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

export const TIER_BASE_SCORE: Record<Tier, number> = {
    'S+': 100,
    'S': 80,
    'A': 60,
    'B': 40,
    'C': 20,
    'D': 0
};

export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = { A: 8, B: 4, C: 0, D: -5, E: -10 };

/**
 * Calculates the Final Score for 11 Ideal selection.
 * Score = Manual Tier Base Points + Performance Average + Live Update Bonus.
 */
export function calculateFinalScore(
  manualTier: Tier,
  overallAverage: number, 
  matches: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
  prioritizeRecentForm: boolean = false
): number {
  const effectiveRecentAverage = recentAverage ?? overallAverage;
  const recentWeight = prioritizeRecentForm ? 0.7 : 0.3;
  const overallWeight = 1 - recentWeight;
  
  const performanceAverage = (overallAverage * overallWeight) + (effectiveRecentAverage * recentWeight);
  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  
  // Base points from the manual tier you assigned
  const tierBase = TIER_BASE_SCORE[manualTier];

  // Final Score: Tier dictates the bracket, average and live update decide within that bracket
  let finalScore = tierBase + performanceAverage + liveUpdateBonus;

  // Confidence adjustment for players with very few matches
  if (matches < 3) finalScore -= 10;
  else if (matches < 5) finalScore -= 5;

  return finalScore;
}

export function isSpecialCard(cardName: string): boolean {
  if (!cardName) return false;
  const n = cardName.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm');
}

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
    newStats.finishing = (getBase('finishing', 'baseFinishing' as any) || 0) + sP;
    newStats.placeKicking = (getBase('placeKicking', 'basePlaceKicking' as any) || 0) + sP;
    newStats.curl = (getBase('curl', 'baseCurl' as any) || 0) + sP;
    const pP = build.passing || 0;
    newStats.lowPass = (getBase('lowPass', 'baseLowPass' as any) || 0) + pP;
    newStats.loftedPass = (getBase('loftedPass', 'baseLoftedPass' as any) || 0) + pP;
    const dP = build.dribbling || 0;
    newStats.ballControl = (getBase('ballControl', 'baseBallControl' as any) || 0) + dP;
    newStats.dribbling = (getBase('dribbling', 'baseDribbling' as any) || 0) + dP;
    newStats.tightPossession = (getBase('tightPossession', 'baseTightPossession' as any) || 0) + dP;
    const dxP = build.dexterity || 0;
    newStats.offensiveAwareness = (getBase('offensiveAwareness', 'baseOffensiveAwareness' as any) || 0) + dxP;
    newStats.acceleration = (getBase('acceleration', 'baseAcceleration' as any) || 0) + dxP;
    newStats.balance = (getBase('balance', 'baseBalance' as any) || 0) + dxP;
    const lbP = build.lowerBodyStrength || 0;
    newStats.speed = (getBase('speed', 'baseSpeed' as any) || 0) + lbP;
    newStats.kickingPower = (getBase('kickingPower', 'baseKickingPower' as any) || 0) + lbP;
    newStats.stamina = (getBase('stamina', 'baseStamina' as any) || 0) + lbP;
    const aP = build.aerialStrength || 0;
    newStats.heading = (getBase('heading', 'baseHeading' as any) || 0) + aP;
    newStats.jump = (getBase('jump', 'baseJump' as any) || 0) + aP;
    newStats.physicalContact = (getBase('physicalContact', 'basePhysicalContact' as any) || 0) + aP;
    const dfP = build.defending || 0;
    newStats.defensiveAwareness = (getBase('defensiveAwareness', 'baseDefensiveAwareness' as any) || 0) + dfP;
    newStats.defensiveEngagement = (getBase('defensiveEngagement', 'baseDefensiveEngagement' as any) || 0) + dfP;
    newStats.tackling = (getBase('tackling', 'baseTackling' as any) || 0) + dfP;
    newStats.aggression = (getBase('aggression', 'baseAggression' as any) || 0) + dfP;
  } else {
    const gk1 = build.gk1 || 0;
    newStats.goalkeeping = (getBase('goalkeeping', 'baseGoalkeeping' as any) || 0) + gk1;
    newStats.jump = (getBase('jump', 'baseJump' as any) || 0) + gk1;
    const gk2 = build.gk2 || 0;
    newStats.gkParrying = (getBase('gkParrying', 'baseGkParrying' as any) || 0) + gk2;
    newStats.gkReach = (getBase('gkReach', 'baseGkReach' as any) || 0) + gk2;
    const gk3 = build.gk3 || 0;
    newStats.gkCatching = (getBase('gkCatching', 'baseGkCatching' as any) || 0) + gk3;
    newStats.gkReflexes = (getBase('gkReflexes', 'baseGkReflexes' as any) || 0) + gk3;
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
