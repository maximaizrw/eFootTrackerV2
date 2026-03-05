import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, IdealBuild, IdealBuildType } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateGeneralScore, calculateRecencyWeightedAverage, getIdealBuildForPlayer, calculateProgressionStats, isSpecialCard, calculateAffinityWithBreakdown } from './utils';

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
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false,
  targetIdealType: IdealBuildType = 'Contraataque largo',
  selectionCriteria: 'general' | 'average' = 'general',
  prioritizeRecentForm: boolean = false
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
        const recentAverage = calculateRecencyWeightedAverage(ratings, 3, 2.5, 0.9);
        
        const buildForPos = card.buildsByPosition?.[pos];
        const specialCard = isSpecialCard(card.name);
        const finalStats = specialCard || !buildForPos ? (card.attributeStats || {}) : calculateProgressionStats(card.attributeStats || {}, buildForPos, pos === 'PT');
        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType, card.physicalAttributes?.height, buildForPos?.forcedBuildId);
        const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
        const affinityScore = affinityBreakdown.totalAffinityScore;
        const isSpecialist = !!bestBuild && bestBuild.profileName !== 'General' && affinityScore >= 92;

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: averagesByPosition.size >= 3,
            isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
            isStalwart: stats.matches >= 100 && stats.average >= 7.0,
            isSpecialist,
        };
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false, recentAverage, prioritizeRecentForm);
        const substituteScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, true, recentAverage, prioritizeRecentForm);

        return { player, card, position: pos, average: stats.average, affinityScore, generalScore, substituteScore, performance };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const starterSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (selectionCriteria === 'average') {
        if (Math.abs(b.average - a.average) > 0.01) return b.average - a.average;
        return b.affinityScore - a.affinityScore;
    }
    if (Math.abs(b.generalScore - a.generalScore) > 0.01) return b.generalScore - a.generalScore;
    if (Math.abs(b.affinityScore - a.affinityScore) > 0.01) return b.affinityScore - a.affinityScore;
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const getEffectiveSubstituteScore = (candidate: CandidatePlayer) => {
    return candidate.substituteScore;
  };

  const substituteSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    // CRITERIO PRINCIPAL: MENOS PARTIDOS SIEMPRE (Priorizar rodaje)
    const matchGap = a.performance.stats.matches - b.performance.stats.matches;
    if (matchGap !== 0) return matchGap;

    // CRITERIO SECUNDARIO: PUNTAJE DE SUPLENTE (Rendimiento + Afinidad)
    const scoreA = getEffectiveSubstituteScore(a);
    const scoreB = getEffectiveSubstituteScore(b);
    if (Math.abs(scoreB - scoreA) > 0.01) return scoreB - scoreA;

    return b.affinityScore - a.affinityScore;
  };

  const passesLiveUpdateFilter = (candidate: CandidatePlayer, options: { isSub: boolean; relaxRatings: boolean }) => {
    const rating = candidate.player.liveUpdateRating;
    if (!rating) return true;
    if (options.relaxRatings) return rating !== 'D' && rating !== 'E';

    if (rating === 'A' || rating === 'B') return true;
    if (rating === 'C') {
      const scoreThreshold = options.isSub ? 83 : 86;
      const baselineScore = options.isSub ? getEffectiveSubstituteScore(candidate) : candidate.generalScore;
      return baselineScore >= scoreThreshold;
    }

    return false;
  };

  const isEligibleSubstituteByPerformance = (candidate: CandidatePlayer) => {
    const { matches, average } = candidate.performance.stats;
    if (matches < 5) return true; // Fase de prueba: Elegibles por defecto
    return average > 6; // Fase de rendimiento: Requiere nota mínima
  };

  const findBestPlayer = (candidates: CandidatePlayer[], options: { isSub: boolean, minAffinity: number, relaxRatings: boolean, relaxAffinity: boolean }): CandidatePlayer | undefined => {
      return candidates.find(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
        
        if (options.isSub) {
            if (p.affinityScore < 80) return false;
            if (!isEligibleSubstituteByPerformance(p)) return false;
        } else {
            if (!options.relaxAffinity && p.affinityScore < options.minAffinity) return false;
        }
        
        if (!passesLiveUpdateFilter(p, { isSub: options.isSub, relaxRatings: options.relaxRatings })) return false;
        
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
    
    if (formationSlot.minHeight) {
        filtered = filtered.filter(p => (p.card.physicalAttributes?.height || 0) >= formationSlot.minHeight!);
    }
    
    if (formationSlot.secondaryPosition) {
        filtered = filtered.filter(p => p.card.ratingsByPosition && p.card.ratingsByPosition[formationSlot.secondaryPosition!]);
    }

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
            const buildInPos = p.card.buildsByPosition?.[p.position];
            const { bestBuild } = getIdealBuildForPlayer(p.card.style, p.position, idealBuilds, targetIdealType, p.card.physicalAttributes?.height, buildInPos?.forcedBuildId);
            return bestBuild?.profileName === formationSlot.profileName;
        });
    }
    
    return filtered.sort(isSub ? substituteSort : starterSort);
  }

  const formationPositions = new Set(formation.slots.map(s => s.position));
  if (isFlexibleLaterals) {
      if (formationPositions.has('LI') || formationPositions.has('LD')) {
          formationPositions.add('LI');
          formationPositions.add('LD');
      }
  }
  if (isFlexibleWingers) {
      if (formationPositions.has('EXI') || formationPositions.has('EXD')) {
          formationPositions.add('EXI');
          formationPositions.add('EXD');
      }
  }

  for (const slot of formation.slots) {
    let cand = getCandidatesForSlot(slot, true, false, false);
    let starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false, relaxAffinity: false });
    
    if (!starter) {
        cand = getCandidatesForSlot(slot, true, true, false);
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: false, relaxAffinity: false });
    }
    if (!starter) {
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 80, relaxRatings: true, relaxAffinity: false });
    }
    if (!starter) {
        starter = findBestPlayer(cand, { isSub: false, minAffinity: 0, relaxRatings: true, relaxAffinity: true });
    }

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    finalTeamSlots.push({ starter: starter ? { ...starter, assignedPosition: slot.position } : null, substitute: null });
  }
  
  const eligibleSubsList = allPlayerCandidates
    .filter(p => formationPositions.has(p.position))
    .sort(substituteSort);

  const getSubForPos = (pos: Position) => {
      return eligibleSubsList.find(p => {
          if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
          if (p.position !== pos) return false;
          if (p.affinityScore < 80) return false;
          if (!isEligibleSubstituteByPerformance(p)) return false;
          if (!passesLiveUpdateFilter(p, { isSub: true, relaxRatings: true })) return false;
          return true;
      });
  }

  finalTeamSlots.forEach((slot, i) => {
    const originalSlot = formation.slots[i];
    const subPos = (slot.starter && slot.starter.position !== originalSlot.position) ? slot.starter.position : originalSlot.position;
    
    const sub = getSubForPos(subPos);

    if (sub) {
      usedPlayerIds.add(sub.player.id);
      usedCardIds.add(sub.card.id);
      slot.substitute = { ...sub, assignedPosition: originalSlot.position };
    }
  });

  const remainingSubSlotsCount = finalTeamSlots.filter(s => s.substitute === null).length;
  if (remainingSubSlotsCount > 0) {
      const unfilledIndices = finalTeamSlots.map((s, i) => s.substitute === null ? i : -1).filter(i => i !== -1);
      
      unfilledIndices.forEach(idx => {
          const originalSlot = formation.slots[idx];
          const subPos = (finalTeamSlots[idx].starter && finalTeamSlots[idx].starter!.position !== originalSlot.position) ? finalTeamSlots[idx].starter!.position : originalSlot.position;
          
          const fallbackSub = eligibleSubsList.find(p => {
              if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
              if (p.position !== subPos) return false;
              return true;
          });

          if (fallbackSub) {
              usedPlayerIds.add(fallbackSub.player.id);
              usedCardIds.add(fallbackSub.card.id);
              finalTeamSlots[idx].substitute = { ...fallbackSub, assignedPosition: originalSlot.position };
          }
      });
  }

  const extraSub = eligibleSubsList.find(p => {
      if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
      return true;
  });
  
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
    
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`) : null), 
        substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`) : null) 
    };
  });
}
