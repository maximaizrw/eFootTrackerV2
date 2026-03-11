import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, Position, LiveUpdateRating, IdealRoleBuild, PlayerSkill } from "./types";

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

export function calculateRoleRating(
  playerStats: PlayerAttributeStats = {}, 
  playerSkills: PlayerSkill[] = [], 
  idealBuild: IdealRoleBuild | null
): number {
  if (!idealBuild) return 0;

  const targetStats = idealBuild.targetStats;
  const targetStatKeys = Object.keys(targetStats) as (keyof PlayerAttributeStats)[];
  const targetSkills = idealBuild.targetSkills;
  
  if (targetStatKeys.length === 0 && targetSkills.length === 0) return 100;

  // NEW PRIORITY-BASED LOGIC
  if (idealBuild.priorityList && idealBuild.priorityList.length > 0) {
    const list = idealBuild.priorityList;
    const n = list.length;
    let totalScore = 0;
    let maxTotalScore = 0;

    for (let i = 0; i < n; i++) {
      const item = list[i];
      const weight = n - i; // first item has weight n, last item has weight 1
      maxTotalScore += (100 * weight);

      if (item.type === 'stat') {
         const targetVal = targetStats[item.key as keyof PlayerAttributeStats];
         if (targetVal !== undefined && targetVal > 0) {
           const playerVal = playerStats[item.key as keyof PlayerAttributeStats] || 0;
           if (playerVal >= targetVal) {
             totalScore += (100 * weight);
           } else {
             const diff = targetVal - playerVal;
             const percentage = Math.max(0, 100 - (diff * 2.5)); // penalty
             totalScore += (percentage * weight);
           }
         } else {
           // Fallback if target is not defined (shouldn't happen with valid priority list)
           totalScore += (100 * weight);
         }
      } else if (item.type === 'skill') {
         const hasSkill = playerSkills.includes(item.key as PlayerSkill);
         totalScore += ((hasSkill ? 100 : 0) * weight);
      }
    }

    return maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 100;
  }

  // LEGACY LOGIC
  let statScore = 0;
  let maxStatScore = 0;

  for (const key of targetStatKeys) {
    const targetVal = targetStats[key];
    if (targetVal === undefined || targetVal <= 0) continue;
    
    maxStatScore += 100;
    const playerVal = playerStats[key] || 0;
    
    if (playerVal >= targetVal) {
      statScore += 100;
    } else {
      const diff = targetVal - playerVal;
      const percentage = Math.max(0, 100 - (diff * 2.5)); // penalty
      statScore += percentage;
    }
  }

  const statRating = maxStatScore > 0 ? (statScore / maxStatScore) * 100 : 100;

  // Skills calculation
  let skillRating = 100;
  if (targetSkills.length > 0) {
      const matchCount = targetSkills.filter(s => playerSkills.includes(s)).length;
      skillRating = (matchCount / targetSkills.length) * 100;
  }

  return Math.round((statRating * 0.8) + (skillRating * 0.2));
}

export function calculateOverall(
  roleRating: number,
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
  
  let performanceScore = ((performanceAverage - 4.0) / (8.5 - 4.0)) * 100;
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  
  let experiencePenalty = 0;
  if (matches > 0) {
    if (matches < 3) experiencePenalty = -15;
    else if (matches < 5) experiencePenalty = -8;
  } else {
    return Math.max(0, Math.min(100, Math.round(roleRating + liveUpdateBonus)));
  }

  let finalOverall = (roleRating * 0.4) + (performanceScore * 0.6) + liveUpdateBonus + experiencePenalty;
  
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
