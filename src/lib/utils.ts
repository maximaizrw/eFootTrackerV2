
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, Position, LiveUpdateRating, Tier } from "./types";

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

export type ScoreBreakdown = {
  tierBase: number;
  performanceAverage: number;
  liveUpdateBonus: number;
  experiencePenalty: number;
  total: number;
};

export function getScoreBreakdown(
  manualTier: Tier,
  overallAverage: number, 
  matches: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
  prioritizeRecentForm: boolean = false
): ScoreBreakdown {
  const effectiveRecentAverage = recentAverage ?? overallAverage;
  const recentWeight = prioritizeRecentForm ? 0.7 : 0.3;
  const overallWeight = 1 - recentWeight;
  
  const performanceAverage = (overallAverage * overallWeight) + (effectiveRecentAverage * recentWeight);
  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  const tierBase = TIER_BASE_SCORE[manualTier];

  let experiencePenalty = 0;
  if (matches < 3) experiencePenalty = -10;
  else if (matches < 5) experiencePenalty = -5;

  return {
    tierBase,
    performanceAverage,
    liveUpdateBonus,
    experiencePenalty,
    total: tierBase + performanceAverage + liveUpdateBonus + experiencePenalty
  };
}

export function calculateFinalScore(
  manualTier: Tier,
  overallAverage: number, 
  matches: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
  prioritizeRecentForm: boolean = false
): number {
  return getScoreBreakdown(manualTier, overallAverage, matches, liveUpdateRating, recentAverage, prioritizeRecentForm).total;
}

export function getProxiedImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('placehold.co') || url.startsWith('/api/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export const allStatsKeys: (keyof PlayerAttributeStats)[] = [
    'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl',
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina',
    'goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'
];

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

export const BADGE_BONUSES = {
    HOT_STREAK: 2,
    CONSISTENT: 1.5,
    VERSATILE: 1,
    PROMISING: 3,
    GAME_CHANGER: 2.5,
    STALWART: 2,
    SPECIALIST: 4
};

export function isSpecialCard(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm');
}
