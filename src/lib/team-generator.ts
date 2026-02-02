
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
};


/**
 * Generates the ideal team (starters and substitutes) based on a given formation.
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

      const averagesByPosition = new Map<Position, number>();
      for (const p in card.ratingsByPosition) {
          const positionKey = p as Position;
          const posRatings = card.ratingsByPosition[positionKey];
          if (posRatings && posRatings.length > 0) {
              averagesByPosition.set(positionKey, calculateStats(posRatings).average);
          }
      }
      
      const highPerfPositions = new Set<Position>();
      for (const [p, avg] of averagesByPosition.entries()) {
          if (avg >= 7.0) highPerfPositions.add(p);
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
        
        let isSpecialist = false;
        const currentAvg = averagesByPosition.get(pos);
        if (currentAvg && currentAvg >= 8.5 && averagesByPosition.size > 1) {
            let otherPositionsWeaker = true;
            for (const [p, avg] of averagesByPosition.entries()) {
                if (p !== pos) {
                    if (avg >= currentAvg - 1.5) {
                        otherPositionsWeaker = false;
                        break;
                    }
                }
            }
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
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating);
        
        return {
          player,
          card,
          position: pos,
          average: stats.average,
          affinityScore,
          generalScore: generalScore,
          performance: performance,
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const sortFunction = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (sortBy === 'general') {
      // 1. General Score
      if (Math.abs(a.generalScore - b.generalScore) > 0.01) {
        return b.generalScore - a.generalScore;
      }
      // 2. Tie-breaker: Affinity Score
      if (Math.abs(a.affinityScore - b.affinityScore) > 0.1) {
        return b.affinityScore - a.affinityScore;
      }
      // 3. Fallback to matches
      return b.performance.stats.matches - a.performance.stats.matches;
    } else { // sortBy === 'average'
      // 1. Average rating
      if (Math.abs(a.average - b.average) > 0.01) {
        return b.average - a.average;
      }
      // 2. Tie-breaker: General Score (still useful to break ties)
      if (Math.abs(a.generalScore - b.generalScore) > 0.01) {
        return b.generalScore - a.generalScore;
      }
      // 3. Fallback to matches
      return b.performance.stats.matches - a.performance.stats.matches;
    }
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
      const availableCandidates = candidates.filter(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) {
            return false;
        }
        
        // Only apply restrictive rules if not filtering by league or nation
        if (league === 'all' && nationality === 'all') {
            const rating = p.player.liveUpdateRating;
            if (rating === 'D' || rating === 'E') {
                return false;
            }
            if (p.generalScore < 90) {
                return false;
            }
        }
        
        return true;
      });
      
      return availableCandidates[0]; // The list is already sorted, just take the best available one.
  };
  
  const getCandidatesForSlot = (formationSlot: FormationSlotType, applyFlexibility: boolean = true, ignoreStyle: boolean = false): CandidatePlayer[] => {
    const slotStyles = formationSlot.styles || [];
    const hasStylePreference = !ignoreStyle && slotStyles.length > 0;
    const targetPosition = formationSlot.position;

    let targetPositions: Position[] = [targetPosition];
    
    if (applyFlexibility) {
      if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) {
        targetPositions = ['LI', 'LD'];
      }
      if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) {
        targetPositions = ['EXI', 'EXD'];
      }
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
            positionCandidates = positionCandidates.filter(p => slotStyles.includes(p.card.style));
        }
    }
    return positionCandidates.sort(sortFunction);
  }

  // --- STARTER SELECTION ---
  for (const formationSlot of formation.slots) {
    // 1. Try with preferred role
    let candidates = getCandidatesForSlot(formationSlot, true, false);
    let starterCandidate = findBestPlayer(candidates);
    
    // 2. Fallback to position only if no role match found
    if (!starterCandidate && formationSlot.styles && formationSlot.styles.length > 0) {
        candidates = getCandidatesForSlot(formationSlot, true, true);
        starterCandidate = findBestPlayer(candidates);
    }
    
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
  finalTeamSlots.forEach((slot, index) => {
    const originalFormationSlot = formation.slots[index];
    
    // Default to original slot, but override if starter is flexible
    const subSearchSlot: FormationSlotType = { ...originalFormationSlot };

    if (slot.starter && slot.starter.position !== originalFormationSlot.position) {
      // The starter is playing in a flexible role (e.g., an LI in an LD slot).
      // The substitute must match the starter's natural position (LI).
      subSearchSlot.position = slot.starter.position;
    }
    
    const getBestSub = (ignoreStyle: boolean) => {
        const candidates = getCandidatesForSlot(subSearchSlot, false, ignoreStyle);
        
        // Tier 1: Prioritize players with < 5 matches
        const tier1 = candidates.filter(p => p.performance.stats.matches < 5);
        let found = findBestPlayer(tier1);
        if (found) return found;

        // Tier 2: If no Tier 1 players, prioritize players with < 10 matches
        const tier2 = candidates.filter(p => p.performance.stats.matches < 10);
        found = findBestPlayer(tier2);
        if (found) return found;

        // Tier 3: If still no one, find the best available player regardless of matches
        return findBestPlayer(candidates);
    };

    // 1. Try with preferred role
    let substituteCandidate = getBestSub(false);

    // 2. Fallback to position only if no role match found (and a role was specified)
    if (!substituteCandidate && subSearchSlot.styles && subSearchSlot.styles.length > 0) {
        substituteCandidate = getBestSub(true);
    }
    
    if (substituteCandidate) {
      usedPlayerIds.add(substituteCandidate.player.id);
      usedCardIds.add(substituteCandidate.card.id);
      // The assigned position is still the original slot in the formation
      slot.substitute = createTeamPlayer(substituteCandidate, originalFormationSlot.position);
    }
  });

  // --- 12th SUBSTITUTE SELECTION ---
  const outfieldFormationPositions = formation.slots.map(s => s.position).filter(p => p !== 'PT');
  
  const allRemainingOutfieldCandidates = allPlayerCandidates
    .filter(p => 
      !usedPlayerIds.has(p.player.id) && 
      !usedCardIds.has(p.card.id) && 
      !discardedCardIds.has(p.card.id) &&
      outfieldFormationPositions.includes(p.position) // Must be a position in the current formation
    )
    .sort(sortFunction);
  
  if (allRemainingOutfieldCandidates.length > 0) {
      // Apply the same tiered "testing" logic for the 12th sub
      const tier1_12th = allRemainingOutfieldCandidates.filter(p => p.performance.stats.matches < 5);
      let extraSubCandidate = findBestPlayer(tier1_12th);

      if (!extraSubCandidate) {
          const tier2_12th = allRemainingOutfieldCandidates.filter(p => p.performance.stats.matches < 10);
          extraSubCandidate = findBestPlayer(tier2_12th);
      }

      if (!extraSubCandidate) {
          extraSubCandidate = findBestPlayer(allRemainingOutfieldCandidates);
      }
      
      if (extraSubCandidate) {
          const assignedPosForExtraSub = extraSubCandidate.position; 
          finalTeamSlots.push({
              starter: null,
              substitute: createTeamPlayer(extraSubCandidate, assignedPosForExtraSub),
          });
      }
  }


  // Fill empty slots and manage final list
  const placeholderPerformance: PlayerPerformance = {
        stats: { average: 0, matches: 0, stdDev: 0 },
        isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false,
        isGameChanger: false, isStalwart: false, isSpecialist: false,
  };
  
  const finalSlots = finalTeamSlots.map((slot, index) => {
    const formationSlot = index < formation.slots.length ? formation.slots[index] : null;
    const assignedPosition = formationSlot?.position || (slot.substitute?.position || 'DFC');

    const placeholderPlayer: IdealTeamPlayer = {
        player: { id: `placeholder-S-${index}`, name: `Vacante`, cards: [], nationality: 'Sin Nacionalidad' as Nationality, permanentLiveUpdateRating: false },
        card: { id: `placeholder-card-S-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
        position: assignedPosition,
        assignedPosition: assignedPosition,
        average: 0,
        affinityScore: 0,
        generalScore: 0,
        performance: placeholderPerformance
    };
    
    const starter = slot.starter || (index < 11 ? placeholderPlayer : null);

    const subPlaceholderPlayer: IdealTeamPlayer = {
      ...placeholderPlayer,
      player: { ...placeholderPlayer.player, id: `placeholder-SUB-${index}`},
      card: { ...placeholderPlayer.card, id: `placeholder-card-SUB-${index}`}
    };
    
    const substitute = slot.substitute || (index < 12 ? subPlaceholderPlayer : null);

    return { starter, substitute };
  });

  return finalSlots.filter(s => s.starter || s.substitute);
}
