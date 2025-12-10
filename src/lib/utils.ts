
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild } from "./types";

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

export function calculateGeneralScore(affinityScore: number, average: number): number {
  const matchAverageOn100 = (average > 0) ? average * 10 : 0;
  const weightedAffinity = affinityScore * 0.4;
  const weightedAverage = matchAverageOn100 * 0.6;
  return weightedAffinity + weightedAverage;
}


// --- New Progression System ---

const MAX_STAT_VALUE = 99;

export function calculateProgressionStats(
  baseStats: PlayerAttributeStats,
  build: PlayerBuild
): PlayerAttributeStats {
  const newStats = { ...baseStats };
  const outfieldBuild = build as OutfieldBuild;

  // --- Shooting ---
  const shootingPoints = outfieldBuild.shooting || 0;
  if (shootingPoints > 0) {
    newStats.finishing = Math.min(MAX_STAT_VALUE, (baseStats.baseFinishing || baseStats.finishing || 0) + shootingPoints);
    newStats.placeKicking = Math.min(MAX_STAT_VALUE, (baseStats.basePlaceKicking || baseStats.placeKicking || 0) + shootingPoints);
    newStats.curl = Math.min(MAX_STAT_VALUE, (baseStats.baseCurl || baseStats.curl || 0) + shootingPoints);
  } else {
    newStats.finishing = (baseStats.baseFinishing || baseStats.finishing || 0);
    newStats.placeKicking = (baseStats.basePlaceKicking || baseStats.placeKicking || 0);
    newStats.curl = (baseStats.baseCurl || baseStats.curl || 0);
  }
  
  // --- Passing ---
  const passingPoints = outfieldBuild.passing || 0;
  if (passingPoints > 0) {
    newStats.lowPass = Math.min(MAX_STAT_VALUE, (baseStats.baseLowPass || baseStats.lowPass || 0) + passingPoints);
    newStats.loftedPass = Math.min(MAX_STAT_VALUE, (baseStats.baseLoftedPass || baseStats.loftedPass || 0) + passingPoints);
  } else {
    newStats.lowPass = (baseStats.baseLowPass || baseStats.lowPass || 0);
    newStats.loftedPass = (baseStats.baseLoftedPass || baseStats.loftedPass || 0);
  }
  
  // --- Dribbling ---
  const dribblingPoints = outfieldBuild.dribbling || 0;
  if (dribblingPoints > 0) {
    newStats.ballControl = Math.min(MAX_STAT_VALUE, (baseStats.baseBallControl || baseStats.ballControl || 0) + dribblingPoints);
    newStats.dribbling = Math.min(MAX_STAT_VALUE, (baseStats.baseDribbling || baseStats.dribbling || 0) + dribblingPoints);
    newStats.tightPossession = Math.min(MAX_STAT_VALUE, (baseStats.baseTightPossession || baseStats.tightPossession || 0) + dribblingPoints);
  } else {
    newStats.ballControl = (baseStats.baseBallControl || baseStats.ballControl || 0);
    newStats.dribbling = (baseStats.baseDribbling || baseStats.dribbling || 0);
    newStats.tightPossession = (baseStats.baseTightPossession || baseStats.tightPossession || 0);
  }


  // TODO: Implement other categories (Dexterity, etc.) here following the same pattern.

  return newStats;
}
