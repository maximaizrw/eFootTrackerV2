
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

export function getAffinityScoreFromBuild(
  playerBuild: PlayerStatsBuild | undefined,
  position: Position,
  style: PlayerStyle,
  idealBuilds: DbIdealBuilds
): number {
  if (style === 'Ninguno' || !playerBuild || Object.keys(playerBuild).length === 0) {
    return 0;
  }
  
  const positionLabel = positionLabels[position];
  const idealBuild = idealBuilds[positionLabel]?.[style];

  if (!idealBuild || Object.keys(idealBuild).length === 0) {
    return 0;
  }

  const gkAttributes: PlayerAttribute[] = [
    "gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach",
    "speed", "acceleration", "kickingPower", "jump"
  ];
  
  const attributesToIterate = position === 'PT' ? gkAttributes : playerAttributes.filter(attr => !gkAttributes.includes(attr));


  let totalScore = 0;

  for (const attr of attributesToIterate) {
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
  const matchAverageScore = average > 0 ? average * 10 : 0;
  return (affinityScore * 0.6) + (matchAverageScore * 0.4);
}
