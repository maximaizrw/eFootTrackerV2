import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PlayerAttributeStats, Position, LiveUpdateRating, IdealRoleBuild, PlayerSkill, PlayerBuild } from "./types";

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
  
  if (targetStatKeys.length === 0 && targetSkills.length === 0) return 0;

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
): number {
  const effectiveRecentAverage = recentAverage ?? overallAverage;

  // Fixed weights: 50% roleRating, 30% historical average, 20% recent average
  const historicalScore = Math.max(0, Math.min(100, ((overallAverage - 4.0) / (8.5 - 4.0)) * 100));
  const recentScore = Math.max(0, Math.min(100, ((effectiveRecentAverage - 4.0) / (8.5 - 4.0)) * 100));

  const liveUpdateBonus = liveUpdateRating ? LIVE_UPDATE_BONUSES[liveUpdateRating] : 0;
  
  let experiencePenalty = 0;
  if (matches > 0) {
    if (matches < 3) experiencePenalty = -15;
    else if (matches < 5) experiencePenalty = -8;
  } else {
    return Math.max(0, Math.min(100, Math.round(roleRating + liveUpdateBonus)));
  }

  let finalOverall = (roleRating * 0.5) + (historicalScore * 0.3) + (recentScore * 0.2) + liveUpdateBonus + experiencePenalty;
  
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

export const getEquivalentPosition = (pos: Position): Position | null => {
    switch (pos) {
        case 'LI': return 'LD';
        case 'LD': return 'LI';
        case 'EXI': return 'EXD';
        case 'EXD': return 'EXI';
        case 'MDI': return 'MDD';
        case 'MDD': return 'MDI';
        default: return null;
    }
};

export const resolveIdealBuild = (pos: Position, role: string, idealBuilds: IdealRoleBuild[]): IdealRoleBuild | null => {
    let build = idealBuilds.find(b => b.position === pos && b.role === role);
    if (build) return build;

    const eqPos = getEquivalentPosition(pos);
    if (eqPos) {
        return idealBuilds.find(b => b.position === eqPos && b.role === role) || null;
    }
    return null;
};

export const calculatePointsSpent = (build: PlayerBuild): number => {
    let totalSpent = 0;
    const computeCost = (level: number) => {
        let cost = 0;
        for (let i = 1; i <= level; i++) {
            if (i <= 4) cost += 1;
            else if (i <= 8) cost += 2;
            else if (i <= 12) cost += 3;
            else cost += Math.ceil(i / 4); // General formula: 13-16 => 4, etc
        }
        return cost;
    };

    const validKeys: (keyof PlayerBuild)[] = ['shooting', 'passing', 'dribbling', 'dexterity', 'lowerBodyStrength', 'aerialStrength', 'defending', 'gk1', 'gk2', 'gk3'];
    for (const key of validKeys) {
        const val = build[key];
        if (typeof val === 'number') {
            totalSpent += computeCost(val);
        }
    }
    return totalSpent;
};

export const calculateFinalStats = (baseStats: PlayerAttributeStats, build: PlayerBuild): PlayerAttributeStats => {
    const finalStats = { ...baseStats };

    const addStat = (stat: keyof PlayerAttributeStats, amount: number) => {
        if (!amount) return;
        finalStats[stat] = Math.min(99, (finalStats[stat] || 0) + amount);
    };

    // Tiro: +Finalización, +Balón parado, +Efecto
    if (build.shooting) {
        addStat('finishing', build.shooting);
        addStat('placeKicking', build.shooting);
        addStat('curl', build.shooting);
    }
    
    // Pase: +Pase raso, +Pase bombeado
    if (build.passing) {
        addStat('lowPass', build.passing);
        addStat('loftedPass', build.passing);
    }
    
    // Regate: +Control del balón, +Drible, +Posesión
    if (build.dribbling) {
        addStat('ballControl', build.dribbling);
        addStat('dribbling', build.dribbling); // En types.d.ts usamos la misma clave dribbling
        addStat('tightPossession', build.dribbling);
    }
    
    // Destreza: +Actitud ofensiva, +Aceleración, +Equilibrio
    if (build.dexterity) {
        addStat('offensiveAwareness', build.dexterity);
        addStat('acceleration', build.dexterity);
        addStat('balance', build.dexterity);
    }
    
    // Fuerza tren inferior: +Velocidad, +Potencia de tiro, +Resistencia
    if (build.lowerBodyStrength) {
        addStat('speed', build.lowerBodyStrength);
        addStat('kickingPower', build.lowerBodyStrength);
        addStat('stamina', build.lowerBodyStrength);
    }
    
    // Fuerza aérea: +Cabeceo, +Salto, +Contacto físico
    if (build.aerialStrength) {
        addStat('heading', build.aerialStrength);
        addStat('jump', build.aerialStrength);
        addStat('physicalContact', build.aerialStrength);
    }
    
    // Defensa: +Actitud defensiva, +Entrada, +Agresividad, +Dedicación defensiva
    if (build.defending) {
        addStat('defensiveAwareness', build.defending);
        addStat('tackling', build.defending);
        addStat('aggression', build.defending);
        addStat('defensiveEngagement', build.defending);
    }
    
    // PT1: +Actitud Portero, +Salto
    if (build.gk1) {
        addStat('goalkeeping', build.gk1);
        addStat('jump', build.gk1);
    }
    
    // PT2: +Parada (Despejar PT), +Cobertura (Alcance PT)
    if (build.gk2) {
        addStat('gkParrying', build.gk2);
        addStat('gkReach', build.gk2);
    }
    
    // PT3: +Atajar PT, +Reflejos PT
    if (build.gk3) {
        addStat('gkCatching', build.gk3);
        addStat('gkReflexes', build.gk3);
    }

    return finalStats;
};
