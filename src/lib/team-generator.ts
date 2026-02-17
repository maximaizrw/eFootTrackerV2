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
    const allPlayerPositions = new Set(player.cards.flatMap(c => Object.keys(c.ratingsByPosition || {})));
    const isOnlyGoalkeeper = allPlayerPositions.size === 1 && allPlayerPositions.has('PT');

    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) return [];
      const averagesByPosition = new Map<Position, number>();
      for (const p in card.ratingsByPosition) {
          const positionKey = p as Position;
          const posRatings = card.ratingsByPosition[positionKey];
          if (posRatings && posRatings.length > 0) averagesByPosition.set(positionKey, calculateStats(posRatings).average);
      }
      
      const highPerfPositions = new Set<Position>();
      for (const [p, avg] of averagesByPosition.entries()) if (avg >= 7.0) highPerfPositions.add(p);
      const isVersatile = highPerfPositions.size >= 3;
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        if (!card.ratingsByPosition?.[pos] || card.ratingsByPosition[pos]!.length === 0) return null;
        if (isOnlyGoalkeeper && pos !== 'PT') return null;

        const ratings = card.ratingsByPosition![pos]!;
        const stats = calculateStats(ratings);
        const recentRatings = ratings.slice(-3);
        const recentStats = calculateStats(recentRatings);
        
        let isSpecialist = false;
        const currentAvg = averagesByPosition.get(pos);
        if (currentAvg && currentAvg >= 8.5 && averagesByPosition.size > 1) {
            let otherPositionsWeaker = true;
            for (const [p, avg] of averagesByPosition.entries()) if (p !== pos && avg >= currentAvg - 1.5) { otherPositionsWeaker = false; break; }
            isSpecialist = otherPositionsWeaker;
        }
        
        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: isVersatile,
            isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
            isStalwart: stats.matches >= 100 && stats.average >= 7.0,
            isSpecialist: isSpecialist,
        };
        
        const buildsMap = sortBy === 'average' ? (card.averageBuildsByPosition || card.buildsByPosition) : card.buildsByPosition;
        const buildForPos = buildsMap?.[pos];
        const specialCard = isSpecialCard(card.name);
        const finalStats = specialCard || !buildForPos ? (card.attributeStats || {}) : calculateProgressionStats(card.attributeStats || {}, buildForPos, pos === 'PT');
        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType, card.physicalAttributes?.height);
        const affinityScore = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false);
        const substituteScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, true);

        return { player, card, position: pos, average: stats.average, affinityScore, generalScore, substituteScore, performance };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const sortFunction = (a: CandidatePlayer, b: CandidatePlayer, useSubScore: boolean = false) => {
    if (sortBy === 'average') {
      if (Math.abs(a.average - b.average) > 0.01) return b.average - a.average;
      const scoreA = useSubScore ? a.substituteScore : a.generalScore;
      const scoreB = useSubScore ? b.substituteScore : b.generalScore;
      if (Math.abs(scoreA - scoreB) > 0.01) return scoreB - scoreA;
      return b.performance.stats.matches - a.performance.stats.matches;
    } else {
      const scoreA = useSubScore ? a.substituteScore : a.generalScore;
      const scoreB = useSubScore ? b.substituteScore : b.generalScore;
      if (Math.abs(scoreA - scoreB) > 0.01) return scoreB - scoreA;
      if (Math.abs(a.affinityScore - b.affinityScore) > 0.1) return b.affinityScore - a.affinityScore;
      return b.performance.stats.matches - a.performance.stats.matches;
    }
  };

  const findBestPlayer = (candidates: CandidatePlayer[]): CandidatePlayer | undefined => {
      return candidates.find(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
        if (p.affinityScore < 80) return false;
        if (sortBy === 'average' && (p.player.liveUpdateRating !== 'A' && p.player.liveUpdateRating !== 'B')) return false;
        if (sortBy !== 'average' && (p.player.liveUpdateRating === 'D' || p.player.liveUpdateRating === 'E')) return false;
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
        } else filtered = filtered.filter(p => slotStyles.includes(p.card.style));
    }
    return filtered.sort((a, b) => sortFunction(a, b, isSub));
  }

  for (const formationSlot of formation.slots) {
    let cand = getCandidatesForSlot(formationSlot, true, false, false);
    let starter = findBestPlayer(cand);
    if (!starter && formationSlot.styles && formationSlot.styles.length > 0) {
        cand = getCandidatesForSlot(formationSlot, true, true, false);
        starter = findBestPlayer(cand);
    }
    if (starter) { usedPlayerIds.add(starter.player.id); usedCardIds.add(starter.card.id); }
    finalTeamSlots.push({ starter: starter ? { player: starter.player, card: starter.card, position: starter.position, assignedPosition: formationSlot.position, affinityScore: starter.affinityScore, generalScore: starter.generalScore, average: starter.average, performance: starter.performance } : null, substitute: null });
  }
  
  finalTeamSlots.forEach((slot, index) => {
    const originalSlot = formation.slots[index];
    const subPos = (slot.starter && slot.starter.position !== originalSlot.position) ? slot.starter.position : originalSlot.position;
    const getSub = (ignore: boolean) => {
        const cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, ignore, true);
        const t1 = cand.filter(p => p.performance.stats.matches < 5);
        let found = findBestPlayer(t1); if (found) return found;
        const t2 = cand.filter(p => p.performance.stats.matches < 10);
        found = findBestPlayer(t2); if (found) return found;
        return findBestPlayer(cand);
    };
    let sub = getSub(false); if (!sub && originalSlot.styles && originalSlot.styles.length > 0) sub = getSub(true);
    if (sub) {
      usedPlayerIds.add(sub.player.id); usedCardIds.add(sub.card.id);
      slot.substitute = { player: sub.player, card: sub.card, position: sub.position, assignedPosition: originalSlot.position, affinityScore: sub.affinityScore, generalScore: sub.substituteScore, average: sub.average, performance: sub.performance };
    }
  });

  const remaining = allPlayerCandidates.filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id))
    .sort((a, b) => sortFunction(a, b, true));
  let extraSub = findBestPlayer(remaining.filter(p => p.performance.stats.matches < 10)) || findBestPlayer(remaining);
  if (extraSub) finalTeamSlots.push({ starter: null, substitute: { player: extraSub.player, card: extraSub.card, position: extraSub.position, assignedPosition: extraSub.position, affinityScore: extraSub.affinityScore, generalScore: extraSub.substituteScore, average: extraSub.average, performance: extraSub.performance } });

  return finalTeamSlots.map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || (slot.substitute?.position || 'DFC');
    const phPerf = { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false };
    const ph = (id: string) => ({ player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' as Nationality }, card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as PlayerStyle, ratingsByPosition: {} }, position: assigned, assignedPosition: assigned, average: 0, affinityScore: 0, generalScore: 0, performance: phPerf } as IdealTeamPlayer);
    return { starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`) : null), substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`) : null) };
  });
}
