import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild, GoalkeeperBuild, IdealBuild, PlayerStyle, Position, BuildPosition, PhysicalAttribute, PlayerSkill, PlayerPerformance, LiveUpdateRating, IdealBuildType, PlayerCard } from "./types";
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

/**
 * Normalizes text for search and comparison.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Normalizes style names to ensure consistency (e.g., Señuelo -> Segundo delantero).
 */
export function normalizeStyleName(style: string): string {
    if (!style) return 'Ninguno';
    if (style === 'Señuelo') return 'Segundo delantero';
    return style;
}

export const BADGE_BONUSES = {
  HOT_STREAK: 3,
  CONSISTENT: 2,
  VERSATILE: 1,
  PROMISING: 1,
  GAME_CHANGER: 2,
  STALWART: 2,
  SPECIALIST: 3,
};

export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = {
  A: 8,
  B: 4,
  C: 0,
  D: -5,
  E: -10,
};


export function calculateGeneralScore(
  affinityScore: number, 
  average: number, 
  matches: number,
  performance: PlayerPerformance,
  liveUpdateRating?: LiveUpdateRating | null,
  skills: PlayerSkill[] = [],
  isSubstitute: boolean = false
): number {
  
  const weight = Math.min(100, matches) / 100;
  const avgWeight = weight;
  const affinityWeight = 1 - weight;

  const avgComponent = ((average * 10) + 50);
  
  let generalScore = (avgComponent * avgWeight) + (affinityScore * affinityWeight);

  // Apply badge bonuses
  if (performance.isHotStreak) generalScore += BADGE_BONUSES.HOT_STREAK;
  if (performance.isConsistent) generalScore += BADGE_BONUSES.CONSISTENT;
  if (performance.isVersatile) generalScore += BADGE_BONUSES.VERSATILE;
  if (performance.isPromising) generalScore += BADGE_BONUSES.PROMISING;
  if (performance.isGameChanger) generalScore += BADGE_BONUSES.GAME_CHANGER;
  if (performance.isStalwart) generalScore += BADGE_BONUSES.STALWART;
  if (performance.isSpecialist) generalScore += BADGE_BONUSES.SPECIALIST;
  
  // Apply live update bonus
  if (liveUpdateRating && LIVE_UPDATE_BONUSES[liveUpdateRating]) {
    generalScore += LIVE_UPDATE_BONUSES[liveUpdateRating];
  }

  // Apply "As en la manga" bonus ONLY for substitutes
  if (isSubstitute && skills.includes('As en la manga')) {
    generalScore += 1;
  }

  return Math.max(0, generalScore);
}


export function isSpecialCard(cardName: string): boolean {
  if (!cardName) return false;
  const lowerCaseCardName = cardName.toLowerCase();
  return lowerCaseCardName.includes('potw') || lowerCaseCardName.includes('pots') || lowerCaseCardName.includes('potm');
}

/**
 * Checks if a player card profile is incomplete.
 */
export function isProfileIncomplete(card: PlayerCard): boolean {
  if (!card) return true;
  const special = isSpecialCard(card.name);
  const hasStats = card.attributeStats && Object.keys(card.attributeStats).length > 0;
  const hasPhysical = card.physicalAttributes && card.physicalAttributes.height !== undefined && card.physicalAttributes.weight !== undefined;
  const hasSkills = card.skills && card.skills.length > 0;
  const hasProgression = special || (card.totalProgressionPoints !== undefined && card.totalProgressionPoints > 0);

  return !hasStats || !hasPhysical || !hasSkills || !hasProgression;
}


// --- New Progression System ---

const MAX_STAT_VALUE = 99;
const MAX_CATEGORY_LEVEL = 16;

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
    targetType: IdealBuildType = 'Contraataque largo',
    height?: number
): { bestBuild: IdealBuild | null; bestStyle: PlayerStyle | null; actualType: IdealBuildType } {
    
    // Normalize incoming style for search
    let normalizedPlayerStyle = normalizeStyleName(playerStyle);

    // Automatic profile selection for Cazagoles
    if (normalizedPlayerStyle === 'Cazagoles' && height !== undefined) {
        if (height >= 187) {
            normalizedPlayerStyle = 'Cazagoles (Tanque)' as any;
        } else {
            normalizedPlayerStyle = 'Cazagoles (Meta)' as any;
        }
    }

    // DEACTIVATION LOGIC: Check if style is active for this position
    const activeStyles = getAvailableStylesForPosition(position, true);
    if (!activeStyles.includes(normalizedPlayerStyle as any)) {
        normalizedPlayerStyle = 'Ninguno';
    }

    const findBuild = (pos: BuildPosition, style: PlayerStyle) => 
        idealBuilds.find(b => b.position === pos && normalizeStyleName(b.style) === normalizeStyleName(style));

    // 1. Strict Search in Contraataque largo
    let build = findBuild(position, normalizedPlayerStyle as any);
    if (build) return { bestBuild: build, bestStyle: normalizeStyleName(build.style) as PlayerStyle, actualType: 'Contraataque largo' };

    // 2. Archetype Search
    const archetype = symmetricalPositionMap[position];
    if (archetype) {
        build = findBuild(archetype, normalizedPlayerStyle as any);
        if (build) return { bestBuild: build, bestStyle: normalizeStyleName(build.style) as PlayerStyle, actualType: 'Contraataque largo' };
    }

    // 3. Fallback to Ninguno
    build = findBuild(position, 'Ninguno');
    if (build) return { bestBuild: build, bestStyle: normalizeStyleName(build.style) as PlayerStyle, actualType: 'Contraataque largo' };

    if (archetype) {
        build = findBuild(archetype, 'Ninguno');
        if (build) return { bestBuild: build, bestStyle: normalizeStyleName(build.style) as PlayerStyle, actualType: 'Contraataque largo' };
    }

    // Last resort: any build for the position
    const anyForPos = idealBuilds.filter(b => b.position === position || b.position === symmetricalPositionMap[position]);
    if (anyForPos.length > 0) {
        return { bestBuild: anyForPos[0], bestStyle: normalizeStyleName(anyForPos[0].style) as PlayerStyle, actualType: 'Contraataque largo' };
    }

    return { bestBuild: null, bestStyle: null, actualType: 'Contraataque largo' };
}


function calculatePhysicalAttributeAffinity(
    playerValue: number | undefined,
    idealRange: { min?: number; max?: number } | undefined,
): number {
    if (playerValue === undefined || idealRange === undefined || (idealRange.min === undefined && idealRange.max === undefined)) {
        return 0;
    }

    const val = Number(playerValue);
    const min = idealRange.min !== undefined ? Number(idealRange.min) : undefined;
    const max = idealRange.max !== undefined ? Number(idealRange.max) : undefined;

    if (
        (min === undefined || val >= min) &&
        (max === undefined || val <= max)
    ) {
        return 2.5; // Bonus for being within the ideal range
    } else if (min !== undefined && val < min) {
        const diff = min - val;
        return -(diff * 0.5); // Penalty for being below min
    } else if (max !== undefined && val > max) {
        const diff = val - max;
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
    height: 'Altura', weight: 'Peso',
};

export function calculateAffinityWithBreakdown(
    playerStats: PlayerAttributeStats,
    idealBuild: IdealBuild | null,
    physicalAttributes?: PhysicalAttribute,
    playerSkills?: PlayerSkill[]
): AffinityBreakdownResult {
    if (!idealBuild) return { totalAffinityScore: 0, breakdown: [], skillsBreakdown: [] };

    let totalAffinityScore = 100;
    const breakdown: AffinityBreakdownResult['breakdown'] = [];
    const skillsBreakdown: AffinityBreakdownResult['skillsBreakdown'] = [];
    const { build: idealBuildStats, primarySkills = [], secondarySkills = [] } = idealBuild;
    const isGoalkeeper = idealBuild.position === 'PT';
    const relevantKeys = isGoalkeeper ? goalkeeperStatsKeys : allStatsKeys;

    // Stat breakdown (HEAVY WEIGHT)
    for (const key of relevantKeys) {
        const playerValue = playerStats[key as keyof PlayerAttributeStats];
        const idealValue = idealBuildStats[key as keyof PlayerAttributeStats];
        let score = 0;

        if (key !== 'placeKicking' && playerValue !== undefined && idealValue !== undefined && idealValue >= 70) {
             const diff = playerValue - idealValue;
            
            if (diff >= 0) {
                // High reward for meeting or exceeding high targets
                score = diff * 0.25; 
            } else {
                // Heavy penalty for missing critical high targets
                if (idealValue >= 90) score = diff * 0.5;
                else if (idealValue >= 80) score = diff * 0.3;
                else score = diff * 0.2;
            }

            score = Math.max(-10, score); // Allow stats to really drop the affinity
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
    const physicalAttrKeys: (keyof PhysicalAttribute)[] = ['height', 'weight'];
    physicalAttrKeys.forEach(key => {
        const playerVal = physicalAttributes?.[key];
        const idealRange = idealBuild[key];
        const score = calculatePhysicalAttributeAffinity(playerVal, idealRange);
        totalAffinityScore += score;
        breakdown.push({
            stat: key,
            label: statLabels[key],
            playerValue: playerVal,
            idealValue: idealRange,
            score,
        });
    });

    // Skills breakdown (LOWER WEIGHT)
    const playerSkillsSet = new Set(playerSkills || []);
    
    // Primary Skills
    for (const idealSkill of primarySkills) {
        const hasSkill = playerSkillsSet.has(idealSkill);
        const score = hasSkill ? 1.0 : -0.5; // Reduced from 2.0 / -1.0
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
        const score = hasSkill ? 0.5 : -0.25; // Reduced from 1.0 / -0.5
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
      
      // Limit to 16 levels per category
      if (currentLevel >= MAX_CATEGORY_LEVEL) continue;

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
      
      // Respect max level cap
      if (currentLevel >= MAX_CATEGORY_LEVEL) continue;

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