import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, Position, LiveUpdateRating, PlayerSkill, PerformanceTag, PlayerTier } from "./types";
import { PLAYER_TIER_BONUSES } from "./types";

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




export function normalizeText(text: string): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function normalizeStyleName(style: string): string {
    if (!style) return 'Ninguno';
    return style;
}

export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = { A: 6, B: 3, C: 0, D: -5, E: -10 };

export function normalizePlayerTier(tier: string | undefined | null): PlayerTier {
  if (!tier) return 'SIN TIER';
  return tier in PLAYER_TIER_BONUSES ? tier as PlayerTier : 'SIN TIER';
}

export function getPlayerTierBonus(tier: PlayerTier | undefined | null): number {
  return PLAYER_TIER_BONUSES[normalizePlayerTier(tier)];
}

export function calculateLikeScore(likes: number, dislikes: number): number {
  // Bayesian smoothing: neutral baseline when no votes
  return ((likes + 1) / (likes + dislikes + 2)) * 100;
}

export function calculateOverall(
  overallAverage: number,
  matches: number,
  likes: number,
  dislikes: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
  tier?: PlayerTier | null,
): number {
  const effectiveRecentAverage = recentAverage ?? overallAverage;

  const historicalScore = Math.max(0, Math.min(100, ((overallAverage - 4.0) / (8.5 - 4.0)) * 100));
  const recentScore = Math.max(0, Math.min(100, ((effectiveRecentAverage - 4.0) / (8.5 - 4.0)) * 100));
  const performanceScore = (historicalScore * 0.6) + (recentScore * 0.4);

  const likeScore = calculateLikeScore(likes, dislikes);

  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  const tierBonus = getPlayerTierBonus(tier);

  let experiencePenalty = 0;
  if (matches > 0) {
    if (matches < 3) experiencePenalty = -15;
    else if (matches < 5) experiencePenalty = -8;
  } else {
    return 0;
  }

  const finalOverall = (performanceScore * 0.6) + (likeScore * 0.4) + liveUpdateBonus + tierBonus + experiencePenalty;

  return Math.max(0, Math.min(100, Math.round(finalOverall)));
}

export type PlayerConfidence = {
  score: number;
  tag: PerformanceTag;
  trendDelta: number;
  recentAverage: number;
};

export function calculatePlayerConfidence(
  average: number,
  matches: number,
  stdDev: number,
  likes: number,
  dislikes: number,
  liveUpdateRating?: LiveUpdateRating | null,
  recentAverage?: number,
): PlayerConfidence {
  if (matches <= 0) {
    return { score: 0, tag: 'evaluar', trendDelta: 0, recentAverage: 0 };
  }

  const effectiveRecentAverage = recentAverage ?? average;
  const trendDelta = effectiveRecentAverage - average;
  const historicalScore = Math.max(0, Math.min(100, ((average - 4.0) / (8.5 - 4.0)) * 100));
  const recentScore = Math.max(0, Math.min(100, ((effectiveRecentAverage - 4.0) / (8.5 - 4.0)) * 100));
  const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev * 28)));
  const sampleScore = Math.max(0, Math.min(100, (1 - Math.exp(-matches / 7)) * 100));
  const likeScore = calculateLikeScore(likes, dislikes);
  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;

  const rawScore =
    (historicalScore * 0.34) +
    (recentScore * 0.24) +
    (consistencyScore * 0.18) +
    (sampleScore * 0.14) +
    (likeScore * 0.10) +
    liveUpdateBonus;

  const lowSamplePenalty = matches < 3 ? 12 : matches < 5 ? 6 : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawScore - lowSamplePenalty)));

  let tag: PerformanceTag = 'evaluar';
  if (matches < 4 && average >= 8) tag = 'promesa';
  else if (matches >= 3 && trendDelta >= 0.55) tag = 'racha';
  else if (matches >= 3 && trendDelta <= -0.6) tag = 'bajon';
  else if (matches >= 5 && (stdDev >= 1.45 || dislikes > likes + 1)) tag = 'riesgo';
  else if (matches >= 6 && score >= 78 && stdDev <= 1.05) tag = 'fijo';
  else if (matches >= 5 && score >= 68) tag = 'estable';

  return { score, tag, trendDelta, recentAverage: effectiveRecentAverage };
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

