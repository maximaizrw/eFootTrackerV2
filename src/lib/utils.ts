

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild, GoalkeeperBuild, IdealBuild, PlayerStyle, Position, BuildPosition } from "./types";
import { getAvailableStylesForPosition } from "./types";

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

export function isSpecialCard(cardName: string): boolean {
  if (!cardName) return false;
  const lowerCaseCardName = cardName.toLowerCase();
  return lowerCaseCardName.includes('potw') || lowerCaseCardName.includes('pots') || lowerCaseCardName.includes('potm');
}


// --- New Progression System ---

const MAX_STAT_VALUE = 99;

const outfieldStatsKeys: (keyof PlayerAttributeStats)[] = [
    'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl',
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'
];

const goalkeeperStatsKeys: (keyof PlayerAttributeStats)[] = [
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'
];


export const allStatsKeys: (keyof PlayerAttributeStats)[] = [
    ...new Set([...outfieldStatsKeys, ...goalkeeperStatsKeys])
];


export function calculateProgressionStats(
  baseStats: PlayerAttributeStats,
  build: PlayerBuild,
  isGoalkeeper: boolean = false
): PlayerAttributeStats {
  const newStats: PlayerAttributeStats = { ...baseStats };
  const outfieldBuild = build as OutfieldBuild;
  const goalkeeperBuild = build as GoalkeeperBuild;

  const getBase = (stat: keyof PlayerAttributeStats, baseStat: keyof PlayerAttributeStats) => 
    baseStats[baseStat] !== undefined ? baseStats[baseStat] : baseStats[stat] || 0;

  if (!isGoalkeeper) {
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
  } else {
    // For GKs, we need to ensure defending stats are also calculated if defending points are applied
    const defendingPoints = (outfieldBuild as any).defending || 0;
     if (defendingPoints > 0) {
        newStats.defensiveAwareness = Math.min(MAX_STAT_VALUE, (getBase('defensiveAwareness', 'baseDefensiveAwareness')!) + defendingPoints);
        newStats.defensiveEngagement = Math.min(MAX_STAT_VALUE, (getBase('defensiveEngagement', 'baseDefensiveEngagement')!) + defendingPoints);
        newStats.tackling = Math.min(MAX_STAT_VALUE, (getBase('tackling', 'baseTackling')!) + defendingPoints);
        newStats.aggression = Math.min(MAX_STAT_VALUE, (getBase('aggression', 'baseAggression')!) + defendingPoints);
     }
  }


  // --- Goalkeeping ---
  const gk1Points = goalkeeperBuild.gk1 || 0;
  const gk2Points = goalkeeperBuild.gk2 || 0;
  const gk3Points = goalkeeperBuild.gk3 || 0;
  newStats.goalkeeping = Math.min(MAX_STAT_VALUE, (getBase('goalkeeping', 'baseGoalkeeping')!) + gk1Points);
  if (isGoalkeeper || !outfieldBuild.aerialStrength) { 
    newStats.jump = Math.min(MAX_STAT_VALUE, (getBase('jump', 'baseJump')!) + gk1Points);
  }
  newStats.gkParrying = Math.min(MAX_STAT_VALUE, (getBase('gkParrying', 'baseGkParrying')!) + gk2Points);
  newStats.gkReach = Math.min(MAX_STAT_VALUE, (getBase('gkReach', 'baseGkReach')!) + gk2Points);
  newStats.gkCatching = Math.min(MAX_STAT_VALUE, (getBase('gkCatching', 'baseGkCatching')!) + gk3Points);
  newStats.gkReflexes = Math.min(MAX_STAT_VALUE, (getBase('gkReflexes', 'baseGkReflexes')!) + gk3Points);
  
  return newStats;
}

const symmetricalPositionMap: Record<Position, BuildPosition | undefined> = {
    'LI': 'LAT', 'LD': 'LAT',
    'MDI': 'INT', 'MDD': 'INT',
    'EXI': 'EXT', 'EXD': 'EXT',
    'PT': undefined, 'DFC': undefined, 'MCD': undefined, 'MC': undefined, 'MO': undefined, 'SD': undefined, 'DC': undefined,
};


export function getIdealBuildForPlayer(
  playerStyle: PlayerStyle,
  position: Position,
  idealBuilds: IdealBuild[],
  playerStats: PlayerAttributeStats,
): { bestBuild: PlayerAttributeStats | null; bestStyle: PlayerStyle | null } {
    
    // 1. Check if the player's native style is valid for the current position
    const isStyleValidForPosition = getAvailableStylesForPosition(position, false).includes(playerStyle);

    // 2. Strict Mode: If style is valid, ONLY search for builds with that style.
    if (playerStyle !== 'Ninguno' && isStyleValidForPosition) {
        const compatiblePositions: BuildPosition[] = [position];
        const archetype = symmetricalPositionMap[position];
        if (archetype) {
            compatiblePositions.push(archetype);
        }

        const strictCandidates = idealBuilds.filter(b =>
            b.style === playerStyle && compatiblePositions.includes(b.position)
        );

        if (strictCandidates.length > 0) {
            // If we found builds for the player's own style, we MUST use one of them.
            // We just need to find which one gives the best affinity (e.g. DFC vs a generic position build)
            let bestStrictBuild: PlayerAttributeStats | null = null;
            let maxAffinity = -Infinity;

            for (const candidate of strictCandidates) {
                const affinity = calculateAutomaticAffinity(playerStats, candidate.build, position === 'PT');
                if (affinity > maxAffinity) {
                    maxAffinity = affinity;
                    bestStrictBuild = candidate.build;
                }
            }
            return { bestBuild: bestStrictBuild, bestStyle: playerStyle };
        }
    }
    
    // 3. Flexible Mode: If player's style is 'Ninguno', invalid for the position, or no build was found in strict mode.
    // Find the best possible role for the player in this position among all available builds.
    const compatiblePositions: BuildPosition[] = [position];
    const archetype = symmetricalPositionMap[position];
    if (archetype) {
        compatiblePositions.push(archetype);
    }
    const positionNativeStyles = getAvailableStylesForPosition(position, false);

    const flexibleCandidates = idealBuilds.filter(b =>
        compatiblePositions.includes(b.position) && positionNativeStyles.includes(b.style)
    );

    if (flexibleCandidates.length === 0) {
        return { bestBuild: null, bestStyle: null };
    }

    let bestFlexBuild: PlayerAttributeStats | null = null;
    let bestFlexStyle: PlayerStyle | null = null;
    let maxFlexAffinity = -Infinity;

    for (const candidate of flexibleCandidates) {
        const affinity = calculateAutomaticAffinity(playerStats, candidate.build, position === 'PT');
        if (affinity > maxFlexAffinity) {
            maxFlexAffinity = affinity;
            bestFlexBuild = candidate.build;
            bestFlexStyle = candidate.style;
        }
    }

    return { bestBuild: bestFlexBuild, bestStyle: bestFlexStyle };
}


export function calculateAutomaticAffinity(
    playerStats: PlayerAttributeStats,
    idealBuildStats: PlayerAttributeStats | null,
    isGoalkeeper: boolean = false
): number {
    if (!idealBuildStats) return 0;

    let totalAffinityScore = 0;
    const relevantKeys = isGoalkeeper ? goalkeeperStatsKeys : allStatsKeys;

    for (const key of relevantKeys) {
        if (key === 'placeKicking') continue;

        const playerStat = playerStats[key];
        const idealStat = idealBuildStats[key];

        if (playerStat !== undefined && idealStat !== undefined && idealStat >= 70) {
            const diff = playerStat - idealStat;
            
            let statScore;
            if (diff >= 0) {
                // Bonus for exceeding the ideal, but reduced
                statScore = diff * 0.1;
            } else {
                // Weighted penalty for being below the ideal
                if (idealStat >= 90) {
                    statScore = diff * 0.35; // Stronger penalty for elite stats
                } else if (idealStat >= 80) {
                    statScore = diff * 0.20; // Medium penalty for key stats
                } else {
                    statScore = diff * 0.15; // Lighter penalty for base stats
                }
            }
            
            const cappedScore = Math.max(-3, statScore);
            
            totalAffinityScore += cappedScore;
        }
    }
    
    return totalAffinityScore;
}


export type AffinityBreakdownResult = {
    totalAffinityScore: number;
    breakdown: {
        stat: keyof PlayerAttributeStats;
        label: string;
        playerValue?: number;
        idealValue?: number;
        score: number;
    }[];
};

export const statLabels: Record<keyof PlayerAttributeStats, string> = {
    offensiveAwareness: 'Act. Ofensiva', ballControl: 'Control de Balón', dribbling: 'Regate', tightPossession: 'Posesión Estrecha',
    lowPass: 'Pase Raso', loftedPass: 'Pase Bombeado', finishing: 'Finalización', heading: 'Cabeceo', placeKicking: 'Balón Parado', curl: 'Efecto',
    defensiveAwareness: 'Act. Defensiva', defensiveEngagement: 'Entrada', tackling: 'Segada', aggression: 'Agresividad',
    goalkeeping: 'Act. Portero', gkCatching: 'Atajar', gkParrying: 'Despejar', gkReflexes: 'Reflejos', gkReach: 'Alcance',
    speed: 'Velocidad', acceleration: 'Aceleración', kickingPower: 'Potencia de Tiro', jump: 'Salto', physicalContact: 'Contacto Físico',
    balance: 'Equilibrio', stamina: 'Resistencia',
};

export function calculateAffinityWithBreakdown(
    playerStats: PlayerAttributeStats,
    idealBuildStats: PlayerAttributeStats | null,
    isGoalkeeper: boolean = false
): AffinityBreakdownResult {
    if (!idealBuildStats) return { totalAffinityScore: 0, breakdown: [] };

    let totalAffinityScore = 0;
    const breakdown: AffinityBreakdownResult['breakdown'] = [];
    const relevantKeys = isGoalkeeper ? goalkeeperStatsKeys : allStatsKeys;

    for (const key of relevantKeys) {
        const playerValue = playerStats[key];
        const idealValue = idealBuildStats[key];
        let score = 0;

        if (key !== 'placeKicking' && playerValue !== undefined && idealValue !== undefined && idealValue >= 70) {
            const diff = playerValue - idealValue;
            
            let statScore;
            if (diff >= 0) {
                // Bonus for exceeding the ideal, but reduced
                statScore = diff * 0.1;
            } else {
                // Weighted penalty for being below the ideal
                if (idealValue >= 90) {
                    statScore = diff * 0.35; // Stronger penalty for elite stats
                } else if (idealValue >= 80) {
                    statScore = diff * 0.20; // Medium penalty for key stats
                } else {
                    statScore = diff * 0.15; // Lighter penalty for base stats
                }
            }

            score = Math.max(-3, statScore);
            totalAffinityScore += score;
        }
        
        breakdown.push({
            stat: key,
            label: statLabels[key] || 'Unknown',
            playerValue,
            idealValue,
            score
        });
    }

    return { totalAffinityScore, breakdown };
}

export const hasProgressionPoints = (build: PlayerBuild | undefined): boolean => {
    if (!build) return false;
    const keys: (keyof PlayerBuild)[] = ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending', 'gk1', 'gk2', 'gk3'];
    return keys.some(key => {
        const value = build[key];
        return typeof value === 'number' && value > 0;
    });
};

// --- Progression Cost Calculation ---

/**
 * Calculates the total progression points (PP) required to reach a specific category level.
 */
export function calculatePointsForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= 4) return level * 1;
  if (level <= 8) return 4 + (level - 4) * 2;
  if (level <= 12) return 12 + (level - 8) * 3;
  return 24 + (level - 12) * 4;
}

/**
 * Calculates the maximum category level achievable with a given number of progression points (PP).
 */
export function calculateLevelForPoints(points: number): number {
  if (points <= 4) return points;
  if (points <= 12) return 4 + Math.floor((points - 4) / 2);
  if (points <= 24) return 8 + Math.floor((points - 12) / 3);
  if (points <= 24) return 8 + Math.floor((points - 12) / 3);
  return 12 + Math.floor((points - 24) / 4);
}


type CategoryName = keyof (OutfieldBuild & GoalkeeperBuild);

const categoryStatsMap: Record<CategoryName, (keyof PlayerAttributeStats)[]> = {
    shooting: ['finishing', 'placeKicking', 'curl'],
    passing: ['lowPass', 'loftedPass'],
    dribbling: ['ballControl', 'dribbling', 'tightPossession'],
    dexterity: ['offensiveAwareness', 'acceleration', 'balance'],
    lowerBodyStrength: ['speed', 'kickingPower', 'stamina'],
    aerialStrength: ['heading', 'jump', 'physicalContact'],
    defending: ['defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression'],
    gk1: ['goalkeeping', 'jump'],
    gk2: ['gkParrying', 'gkReach'],
    gk3: ['gkCatching', 'gkReflexes'],
};

export function calculateProgressionSuggestions(
  baseStats: PlayerAttributeStats,
  idealBuildStats: PlayerAttributeStats | null,
  isGoalkeeper: boolean,
  totalProgressionPoints: number = 50 // Default budget
): Partial<OutfieldBuild & GoalkeeperBuild> {
  if (!idealBuildStats || totalProgressionPoints <= 0) return {};

  const categories: CategoryName[] = isGoalkeeper
    ? ['gk1', 'gk2', 'gk3', 'defending']
    : ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending'];

  let pointsSpent = 0;
  const build: { [key in CategoryName]?: number } = {};
  categories.forEach(cat => build[cat] = 0);

  // Loop until we run out of points or can't make any more useful investments
  while (pointsSpent < totalProgressionPoints) {
    let bestCategory: CategoryName | null = null;
    let highestDeficitValue = -Infinity;
    
    // Calculate the current stats based on the temporary build
    const currentStats = calculateProgressionStats(baseStats, build, isGoalkeeper);

    // In each iteration, find the most "valuable" category to invest in
    for (const category of categories) {
      const currentLevel = build[category]!;
      const costForNextLevel = calculatePointsForLevel(currentLevel + 1) - calculatePointsForLevel(currentLevel);

      // Skip if we can't afford it or category is maxed
      if (costForNextLevel > (totalProgressionPoints - pointsSpent)) {
        continue;
      }
      
      let categoryDeficitValue = 0;
      const statsInCat = categoryStatsMap[category] || [];

      for (const stat of statsInCat) {
        const idealStat = idealBuildStats[stat] ?? 0;
        const currentStat = currentStats[stat] ?? 0;

        if (idealStat < 70 || currentStat >= idealStat) {
          continue; // Ignore stats below the threshold or stats that already meet/exceed the ideal
        }
        
        const deficit = idealStat - currentStat;
        let weight = 1; // Base weight
        if (idealStat >= 90) weight = 3;
        else if (idealStat >= 80) weight = 2;
        
        categoryDeficitValue += deficit * weight;
      }
      
      const value = categoryDeficitValue / costForNextLevel;

      if (value > highestDeficitValue) {
        highestDeficitValue = value;
        bestCategory = category;
      }
    }

    // If we found a valuable category to invest in, do it
    if (bestCategory) {
      const cost = calculatePointsForLevel(build[bestCategory]! + 1) - calculatePointsForLevel(build[bestCategory]!);
      pointsSpent += cost;
      build[bestCategory]! += 1;
    } else {
      // No more valuable investments can be made, so break
      break;
    }
  }

  return build;
}



    



    
