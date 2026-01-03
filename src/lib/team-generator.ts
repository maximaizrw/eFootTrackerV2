

import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, IdealBuild } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateGeneralScore, getIdealBuildForPlayer, calculateProgressionStats, isSpecialCard, calculateAffinityWithBreakdown } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  affinityScore: number;
  generalScore: number;
  position: Position;
  performance: PlayerPerformance;
  momentumScore: number;
};


/**
 * Generates the ideal team (starters and substitutes) based on a given formation.
 * 
 * @param players - The list of all available players.
 * @param formation - The selected formation with defined slots.
 * @param idealBuilds - The list of all ideal builds.
 * @param discardedCardIds - A set of card IDs to exclude from the selection.
 * @param league - The league to filter by.
 * @param nationality - The nationality to filter by.
 * @param sortBy - The metric to sort players by ('average' or 'general').
 * @param isFlexibleLaterals - Whether to allow LIs to play as LD and vice versa.
 * @param isFlexibleWingers - Whether to allow EXIs to play as EXD and vice versa.
 * @returns An array of slots, each with a starter and a substitute.
 */
export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  idealBuilds: IdealBuild[],
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  sortBy: 'average' | 'general' = 'average',
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false
): IdealTeamSlot[] {
  
  
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    if (nationality !== 'all' && player.nationality !== nationality) {
      return [];
    }
    
    const allPlayerPositions = new Set(player.cards.flatMap(c => Object.keys(c.ratingsByPosition || {})));
    const isOnlyGoalkeeper = allPlayerPositions.size === 1 && allPlayerPositions.has('PT');


    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) {
        return [];
      }

      const highPerfPositions = new Set<Position>();
      for (const p in card.ratingsByPosition) {
          const positionKey = p as Position;
          const posRatings = card.ratingsByPosition[positionKey];
          if (posRatings && posRatings.length > 0) {
              const posAvg = calculateStats(posRatings).average;
              if (posAvg >= 7.0) highPerfPositions.add(positionKey);
          }
      }
      const isVersatile = highPerfPositions.size >= 3;
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        if (!card.ratingsByPosition?.[pos] || card.ratingsByPosition[pos]!.length === 0) {
            return null;
        }

        // GK Restriction
        if (isOnlyGoalkeeper && pos !== 'PT') {
          return null;
        }

        const ratings = card.ratingsByPosition![pos]!;
        const stats = calculateStats(ratings);
        const recentRatings = ratings.slice(-3);
        const recentStats = calculateStats(recentRatings);
        
        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 10 && stats.average >= 7.0,
            isVersatile: isVersatile,
        };
        
        // Live affinity calculation
        const buildForPos = card.buildsByPosition?.[pos];
        const specialCard = isSpecialCard(card.name);
        const isGoalkeeper = pos === 'PT';
        const finalStats = specialCard || !buildForPos
            ? (card.attributeStats || {})
            : calculateProgressionStats(card.attributeStats || {}, buildForPos, isGoalkeeper);

        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds);
        const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
        const affinityScore = affinityBreakdown.totalAffinityScore;
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches);
        
        // Momentum Score Calculation
        let momentumScore = sortBy === 'general' ? generalScore : stats.average;
        if (performance.isHotStreak) {
            momentumScore *= 1.05; // Apply a 5% bonus for being on a hot streak
        }

        return {
          player,
          card,
          position: pos,
          average: stats.average,
          affinityScore,
          generalScore: generalScore,
          performance: performance,
          momentumScore: momentumScore,
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const sortFunction = (a: CandidatePlayer, b: CandidatePlayer) => {
    // 1. Momentum Score (includes hot streak bonus)
    if (Math.abs(a.momentumScore - b.momentumScore) > 0.01) {
        return b.momentumScore - a.momentumScore;
    }

    // 2. Tie-breaker: Consistency Badge
    // If scores are very close, prefer the consistent player
    if (a.performance.isConsistent !== b.performance.isConsistent) {
        return a.performance.isConsistent ? -1 : 1;
    }

    // 3. Fallback to number of matches
    return b.performance.stats.matches - a.performance.stats.matches;
  };


  const createTeamPlayer = (candidate: CandidatePlayer | undefined, assignedPosition: Position): IdealTeamPlayer | null => {
      if (!candidate) return null;
      return {
          player: candidate.player,
          card: candidate.card,
          position: candidate.position,
          assignedPosition: assignedPosition,
          affinityScore: candidate.affinityScore,
          generalScore: candidate.generalScore,
          average: candidate.average,
          performance: candidate.performance,
      }
  }

  const findBestPlayer = (candidates: CandidatePlayer[]): CandidatePlayer | undefined => {
      return candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id));
  };
  
  const getCandidatesForSlot = (formationSlot: FormationSlotType): CandidatePlayer[] => {
    const slotStyles = formationSlot.styles || [];
    const hasStylePreference = slotStyles.length > 0;
    const targetPosition = formationSlot.position;

    let targetPositions: Position[] = [targetPosition];
    if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) {
      targetPositions = ['LI', 'LD'];
    }
    if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) {
      targetPositions = ['EXI', 'EXD'];
    }


    let positionCandidates = allPlayerCandidates
        .filter(p => targetPositions.includes(p.position));
        
    if (hasStylePreference) {
        // Special case for "Ninguno": find players with deactivated playstyles for the target position.
        if (slotStyles.length === 1 && slotStyles[0] === 'Ninguno') {
            const activeStylesForPos = getAvailableStylesForPosition(targetPosition);
            positionCandidates = positionCandidates.filter(p => !activeStylesForPos.includes(p.card.style));
        } else {
            // Standard filtering: find players that have one of the required styles.
            const styleCandidates = positionCandidates.filter(p => slotStyles.includes(p.card.style));
            if (styleCandidates.length > 0) {
                positionCandidates = styleCandidates;
            }
        }
    }
    return positionCandidates.sort(sortFunction);
  }

  // --- STARTER SELECTION ---
  for (const formationSlot of formation.slots) {
    const candidates = getCandidatesForSlot(formationSlot);
    const starterCandidate = findBestPlayer(candidates);
    
    if (starterCandidate) {
      usedPlayerIds.add(starterCandidate.player.id);
      usedCardIds.add(starterCandidate.card.id);
    }
    
    finalTeamSlots.push({
      starter: createTeamPlayer(starterCandidate, formationSlot.position),
      substitute: null,
    });
  }
  
  // --- SUBSTITUTE SELECTION ---
  let extraSubstitute: IdealTeamPlayer | null = null;

  // Step 1: Find a direct substitute for each starter position, prioritizing players with < 10 matches.
  finalTeamSlots.forEach((slot, index) => {
    const formationSlot = formation.slots[index];
    const allCandidatesForSlot = getCandidatesForSlot(formationSlot);
    
    const testPlayerCandidates = allCandidatesForSlot.filter(p => p.performance.stats.matches < 10);
    
    // Prioritize "test" players (< 10 matches)
    let substituteCandidate = findBestPlayer(testPlayerCandidates);
    
    // If no test player is found, find the best available player regardless of matches
    if (!substituteCandidate) {
        substituteCandidate = findBestPlayer(allCandidatesForSlot);
    }
    
    if (substituteCandidate) {
      usedPlayerIds.add(substituteCandidate.player.id);
      usedCardIds.add(substituteCandidate.card.id);
      slot.substitute = createTeamPlayer(substituteCandidate, formationSlot.position);
    }
  });
  
  // Step 2: Find the 12th substitute (best "Promising" player from a relevant position)
  const formationPositions = new Set(formation.slots.map(s => s.position));
  const promisingPlayersPool = allPlayerCandidates.filter(p => 
      p.performance.isPromising && formationPositions.has(p.position)
  );

  const bestPromisingPlayer = findBestPlayer(promisingPlayersPool.sort(sortFunction));

  if (bestPromisingPlayer) {
    extraSubstitute = createTeamPlayer(bestPromisingPlayer, bestPromisingPlayer.position)!;
    usedPlayerIds.add(bestPromisingPlayer.player.id);
    usedCardIds.add(bestPromisingPlayer.card.id);
  }


  // Fill empty slots and manage final list including extra sub
  const placeholderPerformance: PlayerPerformance = {
        stats: { average: 0, matches: 0, stdDev: 0 },
        isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false
  };
  
  const finalSlots = finalTeamSlots.map((slot, index) => {
    const formationSlot = index < formation.slots.length ? formation.slots[index] : null;
    const assignedPosition = formationSlot?.position || (slot.substitute?.position || 'DFC');

    const placeholderPlayer: IdealTeamPlayer = {
        player: { id: `placeholder-S-${index}`, name: `Vacante`, cards: [], nationality: 'Sin Nacionalidad' as Nationality },
        card: { id: `placeholder-card-S-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
        position: assignedPosition,
        assignedPosition: assignedPosition,
        average: 0,
        affinityScore: 0,
        generalScore: 0,
        performance: placeholderPerformance
    };
    
    const starter = slot.starter || placeholderPlayer;

    const subPlaceholderPlayer: IdealTeamPlayer = {
      ...placeholderPlayer,
      player: { ...placeholderPlayer.player, id: `placeholder-SUB-${index}`},
      card: { ...placeholderPlayer.card, id: `placeholder-card-SUB-${index}`}
    };
    
    const substitute = slot.substitute || subPlaceholderPlayer;

    return { starter, substitute };
  });

  // Add the extra "promise" substitute at the end if found.
  if (extraSubstitute) {
      finalSlots.push({
          starter: null,
          substitute: extraSubstitute
      });
  }

  return finalSlots;
}
