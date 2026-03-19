import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, Position, LiveUpdateRating, PlayerSkill, RoleTier } from "./types";

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

export function getOverallColorClass(overall: number): string {
    if (overall >= 90) return 'text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)] font-black';
    if (overall >= 80) return 'text-purple-400 font-bold';
    if (overall >= 70) return 'text-sky-400 font-bold';
    if (overall >= 60) return 'text-green-400 font-bold';
    return 'text-muted-foreground';
}



export function getTierColorClass(tier: RoleTier): string {
    if (typeof tier !== 'number') return 'text-muted-foreground bg-muted/30 border-border opacity-50';
    if (tier >= 9.0) return 'text-orange-400 bg-orange-400/15 border-orange-400/30 font-bold';
    if (tier >= 8.0) return 'text-purple-400 bg-purple-400/15 border-purple-400/30 font-semibold';
    if (tier >= 7.0) return 'text-sky-400 bg-sky-400/15 border-sky-400/30';
    if (tier >= 5.0) return 'text-green-400 bg-green-400/15 border-green-400/30';
    return 'text-muted-foreground bg-muted/30 border-border';
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function normalizeStyleName(style: string): string {
    if (!style) return 'Ninguno';
    return style;
}

export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = { A: 6, B: 3, C: 0, D: -5, E: -10 };


export function calculateOverall(
  overallAverage: number, 
  matches: number,
  tier: RoleTier,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
): number {
  const effectiveRecentAverage = recentAverage ?? overallAverage;

  const historicalScore = Math.max(0, Math.min(100, ((overallAverage - 4.0) / (8.5 - 4.0)) * 100));
  const recentScore = Math.max(0, Math.min(100, ((effectiveRecentAverage - 4.0) / (8.5 - 4.0)) * 100));
  const performanceScore = (historicalScore * 0.6) + (recentScore * 0.4);

  const tierScore = typeof tier === 'number' ? Math.max(0, Math.min(100, tier * 10)) : 100;

  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  
  let experiencePenalty = 0;
  if (matches > 0) {
    if (matches < 3) experiencePenalty = -15;
    else if (matches < 5) experiencePenalty = -8;
  } else {
    return 0;
  }

  let finalOverall = (performanceScore * 0.5) + (tierScore * 0.5) + liveUpdateBonus + experiencePenalty;
  
  return Math.max(0, Math.min(100, Math.round(finalOverall)));
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

export const positionPriority: Record<Position, number> = {
    'PT': 0,
    'DFC': 1,
    'LI': 2,
    'LD': 3,
    'MCD': 4,
    'MC': 5,
    'MDI': 6,
    'MDD': 7,
    'MO': 8,
    'EXI': 9,
    'EXD': 10,
    'SD': 11,
    'DC': 12
};

export function isSpecialCard(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm') || n.includes('shining stars');
}

export const getEquivalentPosition = (pos: Position): Position | null => {
    switch (pos) {
        case 'LI': return 'LD';
        case 'LD': return 'LI';
        case 'EXI': return 'EXD';
        case 'EXD': return 'EXI';
        case 'MDI': return 'MDD';
        case 'MDD': return 'MDI';
        default: return null;
    }
};

