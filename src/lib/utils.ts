
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position, PlayerStyle, PlayerRatingStats, PlayerStatsBuild, PlayerAttribute, DbIdealBuilds, PositionLabel } from "./types";
import { playerAttributes, positionLabels } from "./types";

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

export function getAverageColorClass(average: number): string {
  if (average >= 8.5) return 'text-green-400';
  if (average >= 7.5) return 'text-cyan-400';
  if (average >= 6.0) return 'text-yellow-400';
  return 'text-orange-400';
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/([A-Z])/g, ' $1');
}

/**
 * Calculates the affinity score of a player's build compared to an ideal build.
 * It now directly uses the position's label to find the correct ideal build.
 *
 * @param playerBuild The stats of the player.
 * @param position The specific position of the player (e.g., 'LI').
 * @param style The player's style.
 * @param idealBuilds The database of all ideal builds, keyed by PositionLabel.
 * @returns An affinity score between 0 and 100.
 */
export function getAffinityScoreFromBuild(
  playerBuild: PlayerStatsBuild | undefined,
  position: Position,
  style: PlayerStyle,
  idealBuilds: DbIdealBuilds
): number {
  if (style === 'Ninguno' || !playerBuild || Object.keys(playerBuild).length === 0) {
    return 0;
  }
  
  // Directly get the label for the position, e.g., 'LI' -> 'Lateral Izquierdo'
  const positionLabel = positionLabels[position];
  
  // Find the ideal build for that specific position label and style.
  const idealBuild = idealBuilds[positionLabel]?.[style];

  if (!idealBuild || Object.keys(idealBuild).length === 0) {
    return 0;
  }

  const gkAttributes: PlayerAttribute[] = [
    "gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach",
    "speed", "acceleration", "kickingPower", "jump"
  ];
  
  const attributesToIterate = position === 'PT' 
    ? gkAttributes 
    : playerAttributes.filter(attr => !gkAttributes.includes(attr));

  let totalScore = 0;
  let attributeCount = 0;

  for (const attr of attributesToIterate) {
    const playerStat = playerBuild[attr];
    const idealStat = idealBuild[attr];

    if (playerStat === undefined || idealStat === undefined || idealStat === 0) {
      continue;
    }
    
    attributeCount++;
    const diff = playerStat - idealStat;
    
    // Weighted scoring: Penalize more for being under the ideal stat.
    if (diff >= 0) {
      // Bonus for exceeding the ideal stat, but with diminishing returns.
      totalScore += 1; // Base score for meeting the stat
      totalScore += Math.min(diff / 5, 1) * 0.5; // Add up to 0.5 bonus
    } else {
      // Penalty for being under the ideal stat.
      totalScore += 1 - Math.min(Math.abs(diff) / 10, 1);
    }
  }
  
  if (attributeCount === 0) return 0;

  const finalScore = (totalScore / attributeCount) * 100;
  return Math.max(0, Math.min(100, finalScore));
}

export function calculateGeneralScore(affinityScore: number, average: number): number {
  const matchAverageScore = average > 0 ? average * 10 : 0;
  return (affinityScore * 0.6) + (matchAverageScore * 0.4);
}
