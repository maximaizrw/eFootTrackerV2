
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild, GoalkeeperBuild, IdealBuild, PlayerStyle, Position, BuildPosition, PhysicalAttribute, PlayerSkill } from "./types";

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

export function calculateGeneralScore(affinityScore: number, average: number, matches: number): number {
  const baseRendimiento = average > 0 ? average * 10 : 0;
  const modificadorAfinidad = (affinityScore - 50) * 0.25;

  let factorFiabilidad: number;
  if (matches < 5) {
      factorFiabilidad = 0.90;
  } else if (matches >= 5 && matches <= 15) {
      factorFiabilidad = 0.95;
  } else {
      factorFiabilidad = 1.0;
  }

  const puntajeGeneral = (baseRendimiento * factorFiabilidad) + modificadorAfinidad;

  return Math.max(0, puntajeGeneral);
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
    idealBuilds: IdealBuild[]
): { bestBuild: IdealBuild | null; bestStyle: PlayerStyle | null } {
    // 1. Strict Search: Exact Position + Player Style
    const strictBuild = idealBuilds.find(b => b.position === position && b.style === playerStyle);
    if (strictBuild) {
        return { bestBuild: strictBuild, bestStyle: playerStyle };
    }

    // 2. Archetype Search: Symmetrical Position Archetype + Player Style
    const archetype = symmetricalPositionMap[position];
    if (archetype) {
        const archetypeBuild = idealBuilds.find(b => b.position === archetype && b.style === playerStyle);
        if (archetypeBuild) {
            return { bestBuild: archetypeBuild, bestStyle: playerStyle };
        }
    }
    
    // 3. Flexible Search: Find the best alternative build for the position
    const compatiblePositions: BuildPosition[] = [position];
    if (archetype) {
        compatiblePositions.push(archetype);
    }
    
    const validBuildsForPosition = idealBuilds.filter(b => compatiblePositions.includes(b.position));

    if (validBuildsForPosition.length === 0) {
        return { bestBuild: null, bestStyle: null };
    }
    
    // Fallback: just return the first valid build if no better logic is defined
    const bestFlexBuild = validBuildsForPosition[0];

    return { bestBuild: bestFlexBuild, bestStyle: bestFlexBuild?.style || null };
}


function calculatePhysicalAttributeAffinity(
    playerValue: number | undefined,
    idealRange: { min?: number; max?: number } | undefined,
): number {
    if (playerValue === undefined || idealRange === undefined || (idealRange.min === undefined && idealRange.max === undefined)) {
        return 0;
    }

    if (
        (idealRange.min === undefined || playerValue >= idealRange.min) &&
        (idealRange.max === undefined || playerValue <= idealRange.max)
    ) {
        return 2.5; // Bonus for being within the ideal range
    } else if (idealRange.min !== undefined && playerValue < idealRange.min) {
        const diff = idealRange.min - playerValue;
        return -(diff * 0.5); // Penalty for being below min
    } else if (idealRange.max !== undefined && playerValue > idealRange.max) {
        const diff = playerValue - idealRange.max;
        return -(diff * 0.25); // Smaller penalty for being above max
    }
    return 0;
}

export type AffinityBreakdownResult = {
    totalAffinityScore: number;
    breakdown: {
        stat: keyof PlayerAttributeStats | keyof PhysicalAttribute;
        label: string;
        playerValue?: number;
        idealValue?: number | { min?: number, max?: number };
        score: number;
    }[];
    skillsBreakdown?: {
        skill: PlayerSkill;
        hasSkill: boolean;
        score: number;
        type: 'primary' | 'secondary';
    }[];
};

export const statLabels: Record<keyof PlayerAttributeStats | keyof PhysicalAttribute, string> = {
    offensiveAwareness: 'Act. Ofensiva', ballControl: 'Control de Balón', dribbling: 'Regate', tightPossession: 'Posesión Estrecha',
    lowPass: 'Pase Raso', loftedPass: 'Pase Bombeado', finishing: 'Finalización', heading: 'Cabeceo', placeKicking: 'Balón Parado', curl: 'Efecto',
    defensiveAwareness: 'Act. Defensiva', defensiveEngagement: 'Entrada', tackling: 'Segada', aggression: 'Agresividad',
    goalkeeping: 'Act. Portero', gkCatching: 'Atajar', gkParrying: 'Despejar', gkReflexes: 'Reflejos', gkReach: 'Alcance',
    speed: 'Velocidad', acceleration: 'Aceleración', kickingPower: 'Potencia de Tiro', jump: 'Salto', physicalContact: 'Contacto Físico',
    balance: 'Equilibrio', stamina: 'Resistencia',
    legLength: 'Largo de Piernas',
};

export function calculateAffinityWithBreakdown(
    playerStats: PlayerAttributeStats,
    idealBuild: IdealBuild | null,
    physicalAttributes?: PhysicalAttribute,
    playerSkills?: PlayerSkill[]
): AffinityBreakdownResult {
    if (!idealBuild) return { totalAffinityScore: 0, breakdown: [], skillsBreakdown: [] };

    let totalAffinityScore = 0;
    const breakdown: AffinityBreakdownResult['breakdown'] = [];
    const skillsBreakdown: AffinityBreakdownResult['skillsBreakdown'] = [];
    const { build: idealBuildStats, primarySkills = [], secondarySkills = [] } = idealBuild;
    const isGoalkeeper = idealBuild.position === 'PT';
    const relevantKeys = isGoalkeeper ? goalkeeperStatsKeys : allStatsKeys;

    // Stat breakdown
    for (const key of relevantKeys) {
        const playerValue = playerStats[key as keyof PlayerAttributeStats];
        const idealValue = idealBuildStats[key as keyof PlayerAttributeStats];
        let score = 0;

        if (key !== 'placeKicking' && playerValue !== undefined && idealValue !== undefined && idealValue >= 70) {
             const diff = playerValue - idealValue;
            
            if (diff >= 0) {
                score = diff * 0.1;
            } else {
                if (idealValue >= 90) score = diff * 0.35;
                else if (idealValue >= 80) score = diff * 0.20;
                else score = diff * 0.15;
            }

            score = Math.max(-3, score);
            totalAffinityScore += score;
        }
        
        breakdown.push({
            stat: key as keyof PlayerAttributeStats,
            label: statLabels[key as keyof PlayerAttributeStats] || 'Unknown',
            playerValue,
            idealValue,
            score
        });
    }

    // Physical attributes breakdown
    const physicalAttrKeys: (keyof PhysicalAttribute)[] = ['legLength'];
    physicalAttrKeys.forEach(key => {
        const score = calculatePhysicalAttributeAffinity(physicalAttributes?.[key], idealBuild[key]);
        totalAffinityScore += score;
        breakdown.push({
            stat: key,
            label: statLabels[key],
            playerValue: physicalAttributes?.[key],
            idealValue: idealBuild[key],
            score,
        });
    });

    // Skills breakdown
    const playerSkillsSet = new Set(playerSkills || []);
    
    // Primary Skills
    for (const idealSkill of primarySkills) {
        const hasSkill = playerSkillsSet.has(idealSkill);
        const score = hasSkill ? 2.0 : -1.0;
        totalAffinityScore += score;
        skillsBreakdown.push({
            skill: idealSkill,
            hasSkill,
            score,
            type: 'primary'
        });
    }

    // Secondary Skills
    for (const idealSkill of secondarySkills) {
        const hasSkill = playerSkillsSet.has(idealSkill);
        const score = hasSkill ? 1.0 : -0.5;
        totalAffinityScore += score;
        skillsBreakdown.push({
            skill: idealSkill,
            hasSkill,
            score,
            type: 'secondary'
        });
    }


    return { totalAffinityScore, breakdown, skillsBreakdown };
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
  idealBuild: IdealBuild | null,
  isGoalkeeper: boolean,
  totalProgressionPoints: number = 50 // Default budget
): Partial<OutfieldBuild & GoalkeeperBuild> {
  if (!idealBuild || totalProgressionPoints <= 0) return {};

  const idealBuildStats = idealBuild.build;
  const categories: CategoryName[] = isGoalkeeper
    ? ['gk1', 'gk2', 'gk3', 'defending']
    : ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending'];

  const build: { [key in CategoryName]?: number } = {};
  categories.forEach(cat => build[cat] = 0);
  let pointsSpent = 0;

  // Loop until we run out of points or can't make any more useful investments
  while (pointsSpent < totalProgressionPoints) {
    let bestCategory: CategoryName | null = null;
    let maxWeightedDeficit = -Infinity;

    for (const category of categories) {
      const currentLevel = build[category]!;
      const costForNextLevel = calculatePointsForLevel(currentLevel + 1) - calculatePointsForLevel(currentLevel);
      
      // If we can't afford the next level, skip this category for this iteration
      if ((pointsSpent + costForNextLevel) > totalProgressionPoints) {
        continue;
      }
      
      // Calculate current stats with a temporary build that includes the next level for this category
      const tempBuild = { ...build, [category]: currentLevel + 1 };
      const projectedStats = calculateProgressionStats(baseStats, tempBuild, isGoalkeeper);
      
      let categoryWeightedDeficit = 0;
      const statsInCat = categoryStatsMap[category] || [];

      for (const stat of statsInCat) {
        const idealStat = idealBuildStats[stat] ?? 0;
        
        // Only consider stats that need improvement
        if (idealStat < 70) continue; 
        
        const currentStat = projectedStats[stat] ?? 0;
        if (currentStat > idealStat) continue; // Don't reward over-leveling

        // Calculate the deficit reduction this single level provides
        const deficitReduction = 1; // Each level point adds 1 to the stat
        
        let weight = 1;
        if (idealStat >= 90) weight = 3;
        else if (idealStat >= 80) weight = 2;
        
        categoryWeightedDeficit += deficitReduction * weight;
      }
      
      const valuePerPoint = categoryWeightedDeficit / costForNextLevel;

      if (valuePerPoint > maxWeightedDeficit) {
        maxWeightedDeficit = valuePerPoint;
        bestCategory = category;
      }
    }

    if (bestCategory && maxWeightedDeficit > 0) {
      const cost = calculatePointsForLevel(build[bestCategory]! + 1) - calculatePointsForLevel(build[bestCategory]!);
      pointsSpent += cost;
      build[bestCategory]! += 1;
    } else {
      // If no category offers improvement, break the loop
      break;
    }
  }

  // If points are left over, distribute them greedily to the cheapest categories
  // that still have some value, to use up the budget.
  while(pointsSpent < totalProgressionPoints) {
    let cheapestCategory: CategoryName | null = null;
    let minCost = Infinity;

    for (const category of categories) {
      const currentLevel = build[category]!;
      const cost = calculatePointsForLevel(currentLevel + 1) - calculatePointsForLevel(currentLevel);

      if ((pointsSpent + cost) <= totalProgressionPoints && cost < minCost) {
          minCost = cost;
          cheapestCategory = category;
      }
    }

    if (cheapestCategory) {
        pointsSpent += minCost;
        build[cheapestCategory]! += 1;
    } else {
        break; // No affordable category found
    }
  }


  return build;
}


