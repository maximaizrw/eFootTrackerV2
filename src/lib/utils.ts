
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild, GoalkeeperBuild, IdealBuild, PlayerStyle, Position } from "./types";

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
const allStatsKeys: (keyof PlayerAttributeStats)[] = [
    'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl',
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'
];


export function calculateProgressionStats(
  baseStats: PlayerAttributeStats,
  build: PlayerBuild
): PlayerAttributeStats {
  const newStats: PlayerAttributeStats = { ...baseStats };
  const outfieldBuild = build as OutfieldBuild;
  const goalkeeperBuild = build as GoalkeeperBuild;

  const getBase = (stat: keyof PlayerAttributeStats, baseStat: keyof PlayerAttributeStats) => 
    baseStats[baseStat] !== undefined ? baseStats[baseStat] : baseStats[stat] || 0;

  // --- Shooting ---
  const shootingPoints = outfieldBuild.shooting || 0;
  newStats.finishing = Math.min(MAX_STAT_VALUE, (getBase('finishing', 'baseFinishing')!) + shootingPoints);
  newStats.placeKicking = Math.min(MAX_STAT_VALUE, (getBase('placeKicking', 'basePlaceKicking')!) + shootingPoints);
  newStats.curl = Math.min(MAX_STAT_VALUE, (getBase('curl', 'baseCurl')!) + shootingPoints);
  
  // --- Passing ---
  const passingPoints = outfieldBuild.passing || 0;
  newStats.lowPass = Math.min(MAX_STAT_VALUE, (getBase('lowPass', 'baseLowPass')!) + passingPoints);
  newStats.loftedPass = Math.min(MAX_STAT_VALUE, (getBase('loftedPass', 'baseLoftedPass')!) + passingPoints);
  
  // --- Dribbling ---
  const dribblingPoints = outfieldBuild.dribbling || 0;
  newStats.ballControl = Math.min(MAX_STAT_VALUE, (getBase('ballControl', 'baseBallControl')!) + dribblingPoints);
  newStats.dribbling = Math.min(MAX_STAT_VALUE, (getBase('dribbling', 'baseDribbling')!) + dribblingPoints);
  newStats.tightPossession = Math.min(MAX_STAT_VALUE, (getBase('tightPossession', 'baseTightPossession')!) + dribblingPoints);

  // --- Dexterity ---
  const dexterityPoints = outfieldBuild.dexterity || 0;
  newStats.offensiveAwareness = Math.min(MAX_STAT_VALUE, (getBase('offensiveAwareness', 'baseOffensiveAwareness')!) + dexterityPoints);
  newStats.acceleration = Math.min(MAX_STAT_VALUE, (getBase('acceleration', 'baseAcceleration')!) + dexterityPoints);
  newStats.balance = Math.min(MAX_STAT_VALUE, (getBase('balance', 'baseBalance')!) + dexterityPoints);

  // --- Lower Body Strength ---
  const lowerBodyPoints = outfieldBuild.lowerBodyStrength || 0;
  newStats.speed = Math.min(MAX_STAT_VALUE, (getBase('speed', 'baseSpeed')!) + lowerBodyPoints);
  newStats.kickingPower = Math.min(MAX_STAT_VALUE, (getBase('kickingPower', 'baseKickingPower')!) + lowerBodyPoints);
  newStats.stamina = Math.min(MAX_STAT_VALUE, (getBase('stamina', 'baseStamina')!) + lowerBodyPoints);

  // --- Aerial Strength ---
  const aerialPoints = outfieldBuild.aerialStrength || 0;
  newStats.heading = Math.min(MAX_STAT_VALUE, (getBase('heading', 'baseHeading')!) + aerialPoints);
  newStats.jump = Math.min(MAX_STAT_VALUE, (getBase('jump', 'baseJump')!) + aerialPoints);
  newStats.physicalContact = Math.min(MAX_STAT_VALUE, (getBase('physicalContact', 'basePhysicalContact')!) + aerialPoints);

  // --- Defending ---
  const defendingPoints = outfieldBuild.defending || 0;
  newStats.defensiveAwareness = Math.min(MAX_STAT_VALUE, (getBase('defensiveAwareness', 'baseDefensiveAwareness')!) + defendingPoints);
  newStats.defensiveEngagement = Math.min(MAX_STAT_VALUE, (getBase('defensiveEngagement', 'baseDefensiveEngagement')!) + defendingPoints);
  newStats.tackling = Math.min(MAX_STAT_VALUE, (getBase('tackling', 'baseTackling')!) + defendingPoints);
  newStats.aggression = Math.min(MAX_STAT_VALUE, (getBase('aggression', 'baseAggression')!) + defendingPoints);

  // --- Goalkeeping ---
  const gk1Points = goalkeeperBuild.gk1 || 0;
  const gk2Points = goalkeeperBuild.gk2 || 0;
  const gk3Points = goalkeeperBuild.gk3 || 0;
  newStats.goalkeeping = Math.min(MAX_STAT_VALUE, (getBase('goalkeeping', 'baseGoalkeeping')!) + gk1Points);
  if(!outfieldBuild.aerialStrength) { 
    newStats.jump = Math.min(MAX_STAT_VALUE, (getBase('jump', 'baseJump')!) + gk1Points);
  }
  newStats.gkParrying = Math.min(MAX_STAT_VALUE, (getBase('gkParrying', 'baseGkParrying')!) + gk2Points);
  newStats.gkReach = Math.min(MAX_STAT_VALUE, (getBase('gkReach', 'baseGkReach')!) + gk2Points);
  newStats.gkCatching = Math.min(MAX_STAT_VALUE, (getBase('gkCatching', 'baseGkCatching')!) + gk3Points);
  newStats.gkReflexes = Math.min(MAX_STAT_VALUE, (getBase('gkReflexes', 'baseGkReflexes')!) + gk3Points);
  
  return newStats;
}

export function getIdealBuildForPlayer(playerStyle: PlayerStyle, position: Position, idealBuilds: IdealBuild[]): PlayerAttributeStats | null {
    const idealBuild = idealBuilds.find(b => b.position === position && b.style === playerStyle);
    return idealBuild ? idealBuild.build : null;
}

export function calculateAutomaticAffinity(
    playerStats: PlayerAttributeStats,
    idealBuildStats: PlayerAttributeStats | null
): number {
    if (!idealBuildStats) return 0;

    let totalAffinityScore = 0;

    for (const key of allStatsKeys) {
        const playerStat = playerStats[key];
        const idealStat = idealBuildStats[key];

        if (playerStat !== undefined && idealStat !== undefined && idealStat >= 70) {
            const diff = playerStat - idealStat;
            
            // Formula: MAX(-3, IF(diff >= 0, diff * 0.15, diff * 0.2))
            const statScore = diff >= 0 ? diff * 0.15 : diff * 0.2;
            const cappedScore = Math.max(-3, statScore);
            
            totalAffinityScore += cappedScore;
        }
    }
    
    return totalAffinityScore;
}
