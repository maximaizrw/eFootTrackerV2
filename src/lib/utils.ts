import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, PlayerBuild, OutfieldBuild, GoalkeeperBuild, IdealBuild, PlayerStyle, Position, BuildPosition, PhysicalAttribute, PlayerSkill, PlayerPerformance, LiveUpdateRating, IdealBuildType, PlayerCard, ManualTier } from "./types";
import { getAvailableStylesForPosition, playerSkillsList, manualTiers, manualTierConfig } from "./types";

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
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function normalizeStyleName(style: string): string {
    if (!style) return 'Ninguno';
    if (style === 'Señuelo') return 'Segundo delantero';
    return style;
}

export const BADGE_BONUSES = { HOT_STREAK: 3, CONSISTENT: 2, VERSATILE: 1, PROMISING: 1, GAME_CHANGER: 2, STALWART: 2, SPECIALIST: 3 };
export const LIVE_UPDATE_BONUSES: Record<LiveUpdateRating, number> = { A: 8, B: 4, C: 0, D: -5, E: -10 };

/**
 * Mappings for Tier List display
 */
export function scoreToTier(score: number): ManualTier {
    if (score >= 100) return 'S+';
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    return 'C';
}

export function tierToScore(tier: ManualTier): number {
    return manualTierConfig[tier].score;
}

/**
 * Calculates a unified score combining affinity and rating performance.
 */
export function calculateGeneralScore(
  affinityScore: number, 
  average: number, 
  matches: number,
  performance: PlayerPerformance,
  liveUpdateRating?: LiveUpdateRating | null,
  skills: PlayerSkill[] = [],
  isSubstitute: boolean = false
): number {
  const realityScore = average * 10;
  const potentialScore = affinityScore;
  
  // Mix 50/50 after 5 matches
  const trustFactor = Math.min(5, matches) / 5;
  
  const averageWeight = 0.5 * trustFactor;
  const affinityWeight = 1 - averageWeight;
  
  let baseScore = (potentialScore * affinityWeight) + (realityScore * averageWeight);

  // Apply performance bonuses
  if (performance.isHotStreak) baseScore += BADGE_BONUSES.HOT_STREAK;
  if (performance.isConsistent) baseScore += BADGE_BONUSES.CONSISTENT;
  if (performance.isVersatile) baseScore += BADGE_BONUSES.VERSATILE;
  if (performance.isPromising) baseScore += BADGE_BONUSES.PROMISING;
  if (performance.isGameChanger) baseScore += BADGE_BONUSES.GAME_CHANGER;
  if (performance.isStalwart) baseScore += BADGE_BONUSES.STALWART;
  if (performance.isSpecialist) baseScore += BADGE_BONUSES.SPECIALIST;
  
  if (liveUpdateRating) baseScore += LIVE_UPDATE_BONUSES[liveUpdateRating] || 0;
  if (isSubstitute && skills.includes('Super refuerzo')) baseScore += 2;

  return Math.max(0, baseScore);
}

export function isSpecialCard(cardName: string): boolean {
  if (!cardName) return false;
  const n = cardName.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm');
}

export function isProfileIncomplete(card: PlayerCard): boolean {
  if (!card) return true;
  const hasStats = card.attributeStats && Object.keys(card.attributeStats).length > 0;
  const hasPhysical = card.physicalAttributes?.height !== undefined && card.physicalAttributes?.weight !== undefined;
  const hasSkills = card.skills && card.skills.length > 0;
  return !hasStats || !hasPhysical || !hasSkills;
}

const MAX_STAT_VALUE = 99;

export const statLabels: Record<keyof PlayerAttributeStats | keyof PhysicalAttribute, string> = {
    offensiveAwareness: 'Act. Ofensiva', 
    ballControl: 'Control del Balón', 
    dribbling: 'Regate', 
    tightPossession: 'Posesión Estrecha',
    lowPass: 'Pase Raso', 
    loftedPass: 'Pase Bombeado', 
    finishing: 'Finalización', 
    heading: 'Cabeceo', 
    placeKicking: 'Balón Parado', 
    curl: 'Efecto',
    defensiveAwareness: 'Actitud defensiva', 
    defensiveEngagement: 'Dedicación defensiva', 
    tackling: 'Entrada', 
    aggression: 'Agresividad',
    goalkeeping: 'Act. de Portero', 
    gkCatching: 'Atajar', 
    gkParrying: 'Parada', 
    gkReflexes: 'Reflejos', 
    gkReach: 'Cobertura',
    speed: 'Velocidad', 
    acceleration: 'Aceleración', 
    kickingPower: 'Potencia de Tiro', 
    jump: 'Salto', 
    physicalContact: 'Contacto Físico',
    balance: 'Equilibrio', 
    stamina: 'Resistencia',
    height: 'Altura', 
    weight: 'Peso',
};

const outfieldStatsKeys: (keyof PlayerAttributeStats)[] = [
    'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl',
    'defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression',
    'speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'
];

const goalkeeperStatsKeys: (keyof PlayerAttributeStats)[] = ['goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'];

export const allStatsKeys: (keyof PlayerAttributeStats)[] = [...new Set([...outfieldStatsKeys, ...goalkeeperStatsKeys])];

export function calculateProgressionStats(baseStats: PlayerAttributeStats, build: PlayerBuild, isGoalkeeper: boolean = false): PlayerAttributeStats {
  const newStats: PlayerAttributeStats = { ...baseStats };
  const getBase = (s: keyof PlayerAttributeStats, b: keyof PlayerAttributeStats) => baseStats[b] !== undefined ? baseStats[b] : baseStats[s] || 0;

  if (!isGoalkeeper) {
    const sP = build.shooting || 0;
    newStats.finishing = Math.min(MAX_STAT_VALUE, getBase('finishing', 'baseFinishing') + sP);
    newStats.placeKicking = Math.min(MAX_STAT_VALUE, getBase('placeKicking', 'basePlaceKicking') + sP);
    newStats.curl = Math.min(MAX_STAT_VALUE, getBase('curl', 'baseCurl') + sP);
    const pP = build.passing || 0;
    newStats.lowPass = Math.min(MAX_STAT_VALUE, getBase('lowPass', 'baseLowPass') + pP);
    newStats.loftedPass = Math.min(MAX_STAT_VALUE, getBase('loftedPass', 'baseLoftedPass') + pP);
    const dP = build.dribbling || 0;
    newStats.ballControl = Math.min(MAX_STAT_VALUE, getBase('ballControl', 'baseBallControl') + dP);
    newStats.dribbling = Math.min(MAX_STAT_VALUE, getBase('dribbling', 'baseDribbling') + dP);
    newStats.tightPossession = Math.min(MAX_STAT_VALUE, getBase('tightPossession', 'baseTightPossession') + dP);
    const dxP = build.dexterity || 0;
    newStats.offensiveAwareness = Math.min(MAX_STAT_VALUE, getBase('offensiveAwareness', 'baseOffensiveAwareness') + dxP);
    newStats.acceleration = Math.min(MAX_STAT_VALUE, getBase('acceleration', 'baseAcceleration') + dxP);
    newStats.balance = Math.min(MAX_STAT_VALUE, getBase('balance', 'baseBalance') + dxP);
    const lbP = build.lowerBodyStrength || 0;
    newStats.speed = Math.min(MAX_STAT_VALUE, getBase('speed', 'baseSpeed') + lbP);
    newStats.kickingPower = Math.min(MAX_STAT_VALUE, getBase('kickingPower', 'baseKickingPower') + lbP);
    newStats.stamina = Math.min(MAX_STAT_VALUE, getBase('stamina', 'baseStamina') + lbP);
    const aP = build.aerialStrength || 0;
    newStats.heading = Math.min(MAX_STAT_VALUE, getBase('heading', 'baseHeading') + aP);
    newStats.jump = Math.min(MAX_STAT_VALUE, getBase('jump', 'baseJump') + aP);
    newStats.physicalContact = Math.min(MAX_STAT_VALUE, getBase('physicalContact', 'basePhysicalContact') + aP);
    const dfP = build.defending || 0;
    newStats.defensiveAwareness = Math.min(MAX_STAT_VALUE, getBase('defensiveAwareness', 'baseDefensiveAwareness') + dfP);
    newStats.defensiveEngagement = Math.min(MAX_STAT_VALUE, getBase('defensiveEngagement', 'baseDefensiveEngagement') + dfP);
    newStats.tackling = Math.min(MAX_STAT_VALUE, getBase('tackling', 'baseTackling') + dfP);
    newStats.aggression = Math.min(MAX_STAT_VALUE, getBase('aggression', 'baseAggression') + dfP);
  } else {
    const gk1 = build.gk1 || 0;
    newStats.goalkeeping = Math.min(MAX_STAT_VALUE, getBase('goalkeeping', 'baseGoalkeeping') + gk1);
    newStats.jump = Math.min(MAX_STAT_VALUE, getBase('jump', 'baseJump') + gk1);
    const gk2 = build.gk2 || 0;
    newStats.gkParrying = Math.min(MAX_STAT_VALUE, getBase('gkParrying', 'baseGkParrying') + gk2);
    newStats.gkReach = Math.min(MAX_STAT_VALUE, getBase('gkReach', 'baseGkReach') + gk2);
    const gk3 = build.gk3 || 0;
    newStats.gkCatching = Math.min(MAX_STAT_VALUE, getBase('gkCatching', 'baseGkCatching') + gk3);
    newStats.gkReflexes = Math.min(MAX_STAT_VALUE, getBase('gkReflexes', 'baseGkReflexes') + gk3);
  }
  return newStats;
}

export const symmetricalPositionMap: Record<Position, BuildPosition | undefined> = {
    'LI': 'LAT', 'LD': 'LAT', 'MDI': 'INT', 'MDD': 'INT', 'EXI': 'EXT', 'EXD': 'EXT',
    'PT': undefined, 'DFC': undefined, 'MCD': undefined, 'MC': undefined, 'MO': undefined, 'SD': undefined, 'DC': undefined,
};

export function getIdealBuildForPlayer(playerStyle: PlayerStyle, position: Position, idealBuilds: IdealBuild[], targetType: IdealBuildType = 'Contraataque largo', height?: number) {
    const baseStyle = normalizeStyleName(playerStyle);
    const activeStyles = getAvailableStylesForPosition(position, true);
    const effectiveStyle = activeStyles.includes(baseStyle as any) ? baseStyle : 'Ninguno';
    const archetype = symmetricalPositionMap[position];
    
    const candidates = idealBuilds.filter(b => (b.position === position || (archetype && b.position === archetype)) && normalizeStyleName(b.style) === effectiveStyle);
    if (candidates.length === 0) {
        const fallbacks = idealBuilds.filter(b => (b.position === position || (archetype && b.position === archetype)) && normalizeStyleName(b.style) === 'Ninguno');
        return findBestBuildByRange(fallbacks.length > 0 ? fallbacks : [], height, 'Ninguno');
    }
    return findBestBuildByRange(candidates, height, effectiveStyle);
}

function findBestBuildByRange(builds: IdealBuild[], height: number | undefined, styleLabel: string) {
    if (!builds || builds.length === 0) return { bestBuild: null, bestStyle: styleLabel };
    if (height && height > 0) {
        const match = builds.find(b => {
            const min = b.height?.min || 0;
            const max = b.height?.max || 0;
            if (min === 0 && max === 0) return false;
            return (min > 0 ? height >= min : true) && (max > 0 ? height <= max : true);
        });
        if (match) return { bestBuild: match, bestStyle: match.profileName ? `${styleLabel} (${match.profileName})` : styleLabel };
    }
    const base = builds.find(b => (!b.height?.min || b.height.min === 0) && (!b.height?.max || b.height.max === 0)) || builds[0];
    return { bestBuild: base, bestStyle: base.profileName ? `${styleLabel} (${base.profileName})` : styleLabel };
}

export function calculateAffinityWithBreakdown(playerStats: PlayerAttributeStats, idealBuild: IdealBuild | null, physicalAttributes?: PhysicalAttribute, playerSkills?: PlayerSkill[]) {
    if (!idealBuild) return { totalAffinityScore: 0, breakdown: [], skillsBreakdown: [] };
    let score = 100;
    const breakdown: any[] = [];
    const skillsBreakdown: any[] = [];
    const { build: iS, primarySkills = [], secondarySkills = [] } = idealBuild;
    const keys = idealBuild.position === 'PT' ? goalkeeperStatsKeys : outfieldStatsKeys;

    keys.forEach(k => {
        const pV = playerStats[k];
        const iV = iS[k];
        let s = 0;
        if (k !== 'placeKicking' && pV !== undefined && iV !== undefined && iV >= 70) {
            const d = pV - iV;
            if (d >= 0) s = d * 0.25;
            else s = iV >= 90 ? d * 0.5 : iV >= 80 ? d * 0.3 : d * 0.2;
            s = Math.max(-10, s);
            score += s;
        }
        breakdown.push({ stat: k, label: statLabels[k], playerValue: pV, idealValue: iV, score: s });
    });

    if (idealBuild.position === 'PT' && physicalAttributes?.height && physicalAttributes.height < 188 && (playerStats.jump || 0) <= 85) {
        score -= 10;
        breakdown.push({ stat: 'jump', label: 'Requisito: Salto > 85 (H < 188cm)', playerValue: playerStats.jump, idealValue: 86, score: -10 });
    }

    const physicalKeys: (keyof PhysicalAttribute)[] = ['height', 'weight'];
    physicalKeys.forEach(k => {
        const pV = physicalAttributes?.[k];
        const range = idealBuild[k];
        let s = 0;
        if (range && pV) {
            const min = range.min || 0;
            const max = range.max || 0;
            if (min > 0 || max > 0) {
                if ((min === 0 || pV >= min) && (max === 0 || pV <= max)) s = 2.5;
                else s = min > 0 && pV < min ? -(min - pV) * 0.5 : -(pV - max) * 0.25;
            }
        }
        score += s;
        breakdown.push({ stat: k, label: statLabels[k], playerValue: pV, idealValue: range, score: s });
    });

    const pSSet = new Set(playerSkills || []);
    primarySkills.forEach(sk => {
        const has = pSSet.has(sk);
        const s = has ? 1.0 : -0.5;
        score += s;
        skillsBreakdown.push({ skill: sk, hasSkill: has, score: s, type: 'primary' });
    });
    secondarySkills.forEach(sk => {
        const has = pSSet.has(sk);
        const s = has ? 0.5 : -0.25;
        score += s;
        skillsBreakdown.push({ skill: sk, hasSkill: has, score: s, type: 'secondary' });
    });

    return { totalAffinityScore: score, breakdown, skillsBreakdown };
}

export function calculatePointsForLevel(l: number): number {
  if (l <= 0) return 0;
  if (l <= 4) return l;
  if (l <= 8) return 4 + (l - 4) * 2;
  if (l <= 12) return 12 + (l - 8) * 3;
  return 24 + (l - 12) * 4;
}

const categoryStatsMap: Record<string, (keyof PlayerAttributeStats)[]> = {
    shooting: ['finishing', 'placeKicking', 'curl'], passing: ['lowPass', 'loftedPass'],
    dribbling: ['ballControl', 'dribbling', 'tightPossession'], dexterity: ['offensiveAwareness', 'acceleration', 'balance'],
    lowerBodyStrength: ['speed', 'kickingPower', 'stamina'], aerialStrength: ['heading', 'jump', 'physicalContact'],
    defending: ['defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression'],
    gk1: ['goalkeeping', 'jump'], gk2: ['gkParrying', 'gkReach'], gk3: ['gkCatching', 'gkReflexes'],
};

export function calculateProgressionSuggestions(base: PlayerAttributeStats, ideal: IdealBuild | null, isGK: boolean, total: number = 50) {
  if (!ideal || total <= 0) return {};
  const cats = isGK ? ['gk1', 'gk2', 'gk3'] : ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending'];
  const b: any = {}; cats.forEach(c => b[c] = 0);
  let spent = 0;
  while (spent < total) {
    let best = null, maxV = -Infinity;
    for (const c of cats) {
      if (b[c] >= 16) continue;
      const cost = calculatePointsForLevel(b[c] + 1) - calculatePointsForLevel(b[c]);
      if (spent + cost > total) continue;
      const proj = calculateProgressionStats(base, { ...b, [c]: b[c] + 1 }, isGK);
      let v = 0;
      for (const s of categoryStatsMap[c]) {
        const iV = ideal.build[s] ?? 0;
        if (iV >= 70 && (proj[s] ?? 0) <= iV) v += iV >= 90 ? 3 : iV >= 80 ? 2 : 1;
      }
      const vPP = v / cost;
      if (vPP > maxV) { maxV = vPP; best = c; }
    }
    if (best && maxV > 0) { spent += calculatePointsForLevel(b[best] + 1) - calculatePointsForLevel(b[best]); b[best]++; }
    else break;
  }
  return b;
}
