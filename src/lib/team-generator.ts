
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
  
  const starterSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (sortBy === 'average') {
      if (Math.abs(a.average - b.average) > 0.01) return b.average - a.average;
      return b.generalScore - a.generalScore;
    }
    if (Math.abs(a.generalScore - b.generalScore) > 0.01) return b.generalScore - a.generalScore;
    return b.affinityScore - a.affinityScore;
  };

  const substituteSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    const isATesting = a.performance.stats.matches < 5;
    const isBTesting = b.performance.stats.matches < 5;
    if (isATesting && !isBTesting) return -1;
    if (!isATesting && isBTesting) return 1;
    if (Math.abs(a.affinityScore - b.affinityScore) > 1) return b.affinityScore - a.affinityScore;
    return b.substituteScore - a.substituteScore;
  };

  const findBestPlayer = (candidates: CandidatePlayer[], options: { isSub: boolean, minAffinity: number, relaxRatings: boolean, relaxAffinity: boolean }): CandidatePlayer | undefined => {
      return candidates.find(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
        
        if (options.isSub) {
            if (p.affinityScore < 80) return false;
            if (p.performance.stats.matches >= 5 && p.performance.stats.average <= 6) return false;
        } else {
            if (!options.relaxAffinity && p.affinityScore < options.minAffinity) return false;
        }
        
        if (!options.relaxRatings) {
            if (sortBy === 'average' && (p.player.liveUpdateRating !== 'A' && p.player.liveUpdateRating !== 'B')) return false;
            if (sortBy !== 'average' && (p.player.liveUpdateRating === 'D' || p.player.liveUpdateRating === 'E')) return false;
        }
        
        return true;
      });
  };
  
  const getCandidatesForSlot = (formationSlot: FormationSlotType, applyFlex: boolean, ignoreStyle: boolean, isSub: boolean): CandidatePlayer[] => {
    const targetPosition = formationSlot.position;
    let targetPositions: Position[] = [targetPosition];
    if (applyFlex) {
      if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
      if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    }
    
    let filtered = allPlayerCandidates.filter(p => targetPositions.includes(p.position));
    if (!ignoreStyle && formationSlot.styles && formationSlot.styles.length > 0) {
        if (formationSlot.styles.length === 1 && formationSlot.styles[0] === 'Ninguno') {
            const activeStyles = getAvailableStylesForPosition(targetPosition);
            filtered = filtered.filter(p => !activeStyles.includes(p.card.style));
        } else {
            filtered = filtered.filter(p => formationSlot.styles!.includes(p.card.style));
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

  // TITULARES: 4 Niveles de búsqueda para evitar VACANTES
  for (const slot of formation.slots) {
    let cand = getCandidatesForSlot(slot, true, false, false);
    let starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false, relaxAffinity: false });
    
    if (!starter) { // Relax Role
        cand = getCandidatesForSlot(slot, true, true, false);
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false, relaxAffinity: false });
    }
    if (!starter) { // Relax Letter
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: true, relaxAffinity: false });
    }
    if (!starter) { // Emergency: Relax Affinity
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 0, relaxRatings: true, relaxAffinity: true });
    }

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    finalTeamSlots.push({ starter: starter ? { ...starter, assignedPosition: slot.position } : null, substitute: null });
  }
  
  // SUPLENTES 1-11: Mismo rol que el titular correspondiente
  finalTeamSlots.forEach((slot, i) => {
    const originalSlot = formation.slots[i];
    const subPos = (slot.starter && slot.starter.position !== originalSlot.position) ? slot.starter.position : originalSlot.position;
    let cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, false, true);
    let sub = findBestPlayer(cand, { isSub: true, minAffinity: 80, relaxRatings: false, relaxAffinity: false }) ||
              findBestPlayer(cand, { isSub: true, minAffinity: 80, relaxRatings: true, relaxAffinity: false });

    if (!sub) { // Variante táctica si no hay rol exacto
        cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, true, true);
        sub = findBestPlayer(cand, { isSub: true, minAffinity: 80, relaxRatings: true, relaxAffinity: false });
    }

    if (sub) {
      usedPlayerIds.add(sub.player.id);
      usedCardIds.add(sub.card.id);
      slot.substitute = { ...sub, assignedPosition: originalSlot.position };
    }
  });

  // SUPLENTE 12: Cualquier rol/posición que aparezca en la formación
  const reqs = formation.slots.map(s => ({ position: s.position, styles: s.styles || [], profileName: s.profileName }));
  const extraCand = allPlayerCandidates.filter(p => {
    if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
    return reqs.some(r => {
        if (p.position !== r.position) return false;
        if (r.profileName && r.profileName !== 'General') {
            const { bestBuild } = getIdealBuildForPlayer(p.card.style, p.position, idealBuilds, targetIdealType, p.card.physicalAttributes?.height);
            if (bestBuild?.profileName !== r.profileName) return false;
        }
        if (r.styles.length > 0) {
            if (r.styles.includes('Ninguno')) {
                return !getAvailableStylesForPosition(r.position).includes(p.card.style);
            }
            return r.styles.includes(p.card.style);
        }
        return true;
    });
  }).sort(substituteSort);
    
  let extraSub = findBestPlayer(extraCand, { isSub: true, minAffinity: 80, relaxRatings: false, relaxAffinity: false }) || 
                 findBestPlayer(extraCand, { isSub: true, minAffinity: 80, relaxRatings: true, relaxAffinity: false });
  
  if (extraSub) {
      finalTeamSlots.push({ starter: null, substitute: { ...extraSub, assignedPosition: extraSub.position } });
  }

  return finalTeamSlots.map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    const phPerf = { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false };
    const ph = (id: string) => ({ 
        player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' as Nationality }, 
        card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
        position: assigned, assignedPosition: assigned, average: 0, affinityScore: 0, generalScore: 0, performance: phPerf 
    } as IdealTeamPlayer);
    return { starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`) : null), substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`) : null) };
  });
}
