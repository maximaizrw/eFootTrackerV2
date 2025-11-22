
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position, PlayerStyle, PlayerRatingStats, PlayerStatsBuild, PlayerAttribute, DbIdealBuilds, PositionLabel } from "./types";
import { playerAttributes, positionLabels, getAvailableStylesForPosition } from "./types";

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
 * Calculates a single affinity score for a player's build against a specific ideal build.
 * @param playerBuild The stats of the player.
 * @param idealBuild The specific ideal build to compare against.
 * @param isGk If the position is a Goalkeeper.
 * @returns An affinity score between 0 and 100.
 */
function calculateScoreAgainstIdeal(
  playerBuild: PlayerStatsBuild,
  idealBuild: PlayerStatsBuild,
  isGk: boolean
): number {
  const gkAttributes: PlayerAttribute[] = [
    "gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach",
    "speed", "acceleration", "kickingPower", "jump"
  ];
  
  const attributesToIterate = isGk
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
    
    if (diff >= 0) {
      totalScore += 1;
      totalScore += Math.min(diff / 5, 1) * 0.5; 
    } else {
      totalScore += 1 - Math.min(Math.abs(diff) / 10, 1);
    }
  }
  
  if (attributeCount === 0) return 0;

  const finalScore = (totalScore / attributeCount) * 100;
  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Calculates the affinity score of a player's build compared to an ideal build for a position.
 * If the player's native style doesn't have a defined ideal build for the position,
 * it finds the best possible affinity score by checking against all other valid styles for that position.
 *
 * @param playerBuild The stats of the player.
 * @param position The specific position of the player (e.g., 'LI').
 * @param style The player's native style.
 * @param idealBuilds The database of all ideal builds, keyed by PositionLabel.
 * @returns An affinity score between 0 and 100.
 */
export function getAffinityScoreFromBuild(
  playerBuild: PlayerStatsBuild | undefined,
  position: Position,
  style: PlayerStyle,
  idealBuilds: DbIdealBuilds
): number {
  if (!playerBuild || Object.keys(playerBuild).length === 0) {
    return 0;
  }
  
  const positionLabel = positionLabels[position];
  const idealBuildsForPosition = idealBuilds[positionLabel];
  const isGk = position === 'PT';

  // If there are no ideal builds defined for this position group at all, no score.
  if (!idealBuildsForPosition) {
    return 0;
  }

  const idealBuildForNativeStyle = style !== 'Ninguno' ? idealBuildsForPosition[style] : undefined;

  // Case 1: An ideal build exists for the player's native style. Calculate score directly.
  if (idealBuildForNativeStyle && Object.keys(idealBuildForNativeStyle).length > 0) {
    return calculateScoreAgainstIdeal(playerBuild, idealBuildForNativeStyle, isGk);
  }
  
  // Case 2: No ideal build for the native style OR style is 'Ninguno'.
  // Find the best possible affinity by checking against all defined ideal builds for that position.
  const availableStyles = getAvailableStylesForPosition(position, false); // Get all valid styles (no "Ninguno")
  let maxAffinity = 0;

  for (const availableStyle of availableStyles) {
    const idealBuildForStyle = idealBuildsForPosition[availableStyle];
    if (idealBuildForStyle && Object.keys(idealBuildForStyle).length > 0) {
      const currentAffinity = calculateScoreAgainstIdeal(playerBuild, idealBuildForStyle, isGk);
      if (currentAffinity > maxAffinity) {
        maxAffinity = currentAffinity;
      }
    }
  }

  return maxAffinity;
}


export function calculateGeneralScore(affinityScore: number, average: number): number {
  const matchAverageScore = average > 0 ? average * 10 : 0;
  return (affinityScore * 0.6) + (matchAverageScore * 0.4);
}
