import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, IdealBuild, IdealBuildType } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateGeneralScore, getIdealBuildForPlayer, calculateProgressionStats, isSpecialCard, calculateAffinityWithBreakdown } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  affinityScore: number;
  generalScore: number;
  substituteScore: number;
  position: Position;
  performance: PlayerPerformance;
};

export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  idealBuilds: IdealBuild[],
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  sortBy: 'average' | 'general' = 'average',
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false,
  targetIdealType: IdealBuildType = 'Contraataque largo'
): IdealTeamSlot[] {
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) return [];
      
      const averagesByPosition = new Map<Position, number>();
      for (const p in card.ratingsByPosition) {
          const posKey = p as Position;
          const posRatings = card.ratingsByPosition[posKey];
          if (posRatings && posRatings.length > 0) averagesByPosition.set(posKey, calculateStats(posRatings).average);
      }
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentRatings = ratings.slice(-3);
        const recentStats = calculateStats(recentRatings);
        
        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: averagesByPosition.size >= 3,
            isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
            isStalwart: stats.matches >= 100 && stats.average >= 7.0,
        };
        
        const buildsMap = sortBy === 'average' ? (card.averageBuildsByPosition || card.buildsByPosition) : card.buildsByPosition;
        const buildForPos = buildsMap?.[pos];
        const specialCard = isSpecialCard(card.name);
        const finalStats = specialCard || !buildForPos ? (card.attributeStats || {}) : calculateProgressionStats(card.attributeStats || {}, buildForPos, pos === 'PT');
        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType, card.physicalAttributes?.height);
        const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
        const affinityScore = affinityBreakdown.totalAffinityScore;
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false);
        const substituteScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, true);

        return { player, card, position: pos, average: stats.average, affinityScore, generalScore, substituteScore, performance };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  // Starter sort: High performance first
  const starterSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (sortBy === 'average') {
      if (Math.abs(a.average - b.average) > 0.01) return b.average - a.average;
      return b.generalScore - a.generalScore;
    } else {
      if (Math.abs(a.generalScore - b.generalScore) > 0.01) return b.generalScore - a.generalScore;
      return b.affinityScore - a.affinityScore;
    }
  };

  // Substitute sort: Prioritize testing (fewer matches), then affinity/score
  const substituteSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    // Testing priority: players with < 5 matches go first
    const isATesting = a.performance.stats.matches < 5;
    const isBTesting = b.performance.stats.matches < 5;
    if (isATesting && !isBTesting) return -1;
    if (!isATesting && isBTesting) return 1;

    // Both are either testing or experienced
    if (Math.abs(a.affinityScore - b.affinityScore) > 1) return b.affinityScore - a.affinityScore;
    return b.substituteScore - a.substituteScore;
  };

  const findBestPlayer = (candidates: CandidatePlayer[], options: { isSub: boolean, minAffinity: number, relaxRatings: boolean, minAvg?: number }): CandidatePlayer | undefined => {
      return candidates.find(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
        
        // Strict bench rules
        if (options.isSub) {
            // Must have > 80 affinity
            if (p.affinityScore <= 80) return false;
            // Rule: After 5 matches, must have avg > 6
            if (p.performance.stats.matches >= 5 && p.performance.stats.average <= 6) return false;
        } else {
            // Starter rules
            if (options.minAffinity > 0 && p.affinityScore < options.minAffinity) return false;
        }
        
        if (!options.relaxRatings) {
            if (sortBy === 'average' && (p.player.liveUpdateRating !== 'A' && p.player.liveUpdateRating !== 'B')) return false;
            if (sortBy !== 'average' && (p.player.liveUpdateRating === 'D' || p.player.liveUpdateRating === 'E')) return false;
        }
        
        return true;
      });
  };
  
  const getCandidatesForSlot = (formationSlot: FormationSlotType, applyFlex: boolean, ignoreStyle: boolean, isSub: boolean): CandidatePlayer[] => {
    const slotStyles = formationSlot.styles || [];
    const targetPosition = formationSlot.position;
    let targetPositions: Position[] = [targetPosition];
    
    if (applyFlex) {
      if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
      if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    }
    
    let filtered = allPlayerCandidates.filter(p => targetPositions.includes(p.position));
    
    if (!ignoreStyle && slotStyles.length > 0) {
        if (slotStyles.length === 1 && slotStyles[0] === 'Ninguno') {
            const activeStyles = getAvailableStylesForPosition(targetPosition);
            filtered = filtered.filter(p => !activeStyles.includes(p.card.style));
        } else {
            filtered = filtered.filter(p => slotStyles.includes(p.card.style));
        }
    }

    if (formationSlot.profileName && formationSlot.profileName !== 'General') {
        filtered = filtered.filter(p => {
            const { bestBuild } = getIdealBuildForPlayer(p.card.style, p.position, idealBuilds, targetIdealType, p.card.physicalAttributes?.height);
            return bestBuild?.profileName === formationSlot.profileName;
        });
    }
    
    return filtered.sort(isSub ? substituteSort : starterSort);
  }

  // STEP 1: STARTERS
  for (const formationSlot of formation.slots) {
    let cand = getCandidatesForSlot(formationSlot, true, false, false);
    let starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false });
    
    if (!starter) {
        cand = getCandidatesForSlot(formationSlot, true, true, false);
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false });
    }
    
    if (!starter) starter = findBestPlayer(cand, { isSub: false, minAffinity: 0, relaxRatings: false });
    // Emergency: Fill the gap
    if (!starter) starter = findBestPlayer(cand, { isSub: false, minAffinity: 0, relaxRatings: true });

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    
    finalTeamSlots.push({ 
        starter: starter ? { ...starter, assignedPosition: formationSlot.position } : null, 
        substitute: null 
    });
  }
  
  // STEP 2: SUBSTITUTES (1 to 11 matched by Role)
  finalTeamSlots.forEach((slot, index) => {
    if (index >= formation.slots.length) return;
    const originalSlot = formation.slots[index];
    const subPos = (slot.starter && slot.starter.position !== originalSlot.position) ? slot.starter.position : originalSlot.position;
    
    // Attempt to find sub matching exact role/position
    let cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, false, true);
    let sub = findBestPlayer(cand, { isSub: true, minAffinity: 80, relaxRatings: false });
    
    if (!sub) sub = findBestPlayer(cand, { isSub: true, minAffinity: 80, relaxRatings: true });

    // Protocol emergency for subs: relax testing rules if none found
    if (!sub) {
        cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, true, true);
        sub = findBestPlayer(cand, { isSub: false, minAffinity: 0, relaxRatings: true }); // Emergency override
    }

    if (sub) {
      usedPlayerIds.add(sub.player.id);
      usedCardIds.add(sub.card.id);
      slot.substitute = { ...sub, assignedPosition: originalSlot.position };
    }
  });

  // STEP 3: SUBSTITUTE 12 (Must match at least one profile from formation)
  const formationRequirements = formation.slots.map(s => ({
    position: s.position,
    styles: s.styles || [],
    profileName: s.profileName
  }));

  const remainingMatchingRequirements = allPlayerCandidates.filter(p => {
    if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
    
    return formationRequirements.some(req => {
        if (p.position !== req.position) return false;
        
        // Profile check
        if (req.profileName && req.profileName !== 'General') {
            const { bestBuild } = getIdealBuildForPlayer(p.card.style, p.position, idealBuilds, targetIdealType, p.card.physicalAttributes?.height);
            if (bestBuild?.profileName !== req.profileName) return false;
        }

        // Style check
        if (req.styles.length === 0) return true;
        if (req.styles.includes('Ninguno')) {
            const activeStyles = getAvailableStylesForPosition(req.position);
            return !activeStyles.includes(p.card.style);
        }
        return req.styles.includes(p.card.style);
    });
  }).sort(substituteSort);
    
  let extraSub = findBestPlayer(remainingMatchingRequirements, { isSub: true, minAffinity: 80, relaxRatings: false }) || 
                 findBestPlayer(remainingMatchingRequirements, { isSub: true, minAffinity: 80, relaxRatings: true }) ||
                 findBestPlayer(remainingMatchingRequirements, { isSub: false, minAffinity: 0, relaxRatings: true }); // Emergency
  
  if (extraSub) {
      finalTeamSlots.push({ 
          starter: null, 
          substitute: { ...extraSub, assignedPosition: extraSub.position } 
      });
  }

  // FINAL: Map placeholders for visual consistency
  return finalTeamSlots.map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    const phPerf = { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false };
    const ph = (id: string) => ({ 
        player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' as Nationality }, 
        card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
        position: assigned, assignedPosition: assigned, average: 0, affinityScore: 0, generalScore: 0, performance: phPerf 
    } as IdealTeamPlayer);
    
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`) : null), 
        substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`) : null) 
    };
  });
}
