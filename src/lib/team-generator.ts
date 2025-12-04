
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality } from './types';
import { calculateStats, calculateGeneralScore } from './utils';

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
 * 
 * @param players - The list of all available players.
 * @param formation - The selected formation with defined slots.
 * @param discardedCardIds - A set of card IDs to exclude from the selection.
 * @param league - The league to filter by.
 * @param nationality - The nationality to filter by.
 * @param sortBy - The metric to sort players by ('average' or 'general').
 * @returns An array of 11 slots, each with a starter and a substitute.
 */
export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  sortBy: 'average' | 'general' = 'average'
): IdealTeamSlot[] {
  
  const hasFilters = league !== 'all' || nationality !== 'all';
  
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

        const isSelectable = card.selectablePositions?.[pos] ?? true;
        if (!hasFilters && !isSelectable) {
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
        
        const affinityScore = card.buildsByPosition?.[pos]?.manualAffinity || 0;
        const generalScore = calculateGeneralScore(affinityScore, stats.average);

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
        if (b.generalScore !== a.generalScore) return b.generalScore - a.generalScore;
    }
    if (b.average !== a.average) return b.average - a.average;
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
  
  const getCandidatesForSlot = (formationSlot: FormationStats['slots'][0]): CandidatePlayer[] => {
    const hasStylePreference = formationSlot.styles && formationSlot.styles.length > 0;
    const targetPosition = formationSlot.position;

    let applicablePositions: Position[] = [targetPosition];
    if (targetPosition === 'LAT') applicablePositions = ['LI', 'LD'];
    if (targetPosition === 'INT') applicablePositions = ['MDI', 'MDD'];
    if (targetPosition === 'EXT') applicablePositions = ['EXI', 'EXD'];
    
    let positionCandidates = allPlayerCandidates
        .filter(p => applicablePositions.includes(p.position))
        .sort(sortFunction);
        
    if (hasStylePreference) {
        const styleCandidates = positionCandidates.filter(p => formationSlot.styles!.includes(p.card.style));
        // If there are players matching the style, we prioritize them
        if (styleCandidates.length > 0) {
            positionCandidates = styleCandidates;
        }
    }
    return positionCandidates;
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
  finalTeamSlots.forEach((slot, index) => {
    const formationSlot = formation.slots[index];
    const candidates = getCandidatesForSlot(formationSlot);

    const findSubstitute = (candidates: CandidatePlayer[]) => {
        // New logic: Prioritize players with few matches (1-3) but high affinity (>=75)
        const toTryOut = candidates.filter(p => 
            p.performance.stats.matches >= 1 &&
            p.performance.stats.matches <= 3 &&
            p.affinityScore >= 75
        );
        
        const promising = candidates.filter(p => p.performance.isPromising);
        const hotStreaks = candidates.filter(p => p.performance.isHotStreak && !p.performance.isPromising);
        const others = candidates.filter(p => !p.performance.isPromising && !p.performance.isHotStreak);

        return findBestPlayer(toTryOut) ||
               findBestPlayer(promising) ||
               findBestPlayer(hotStreaks) || 
               findBestPlayer(others);
    }

    const substituteCandidate = findSubstitute(candidates);

    if (substituteCandidate) {
      usedPlayerIds.add(substituteCandidate.player.id);
      usedCardIds.add(substituteCandidate.card.id);
    }
    
    slot.substitute = createTeamPlayer(substituteCandidate, formationSlot.position);
  });

  // --- FALLBACK FOR EMPTY SUBSTITUTE SLOTS ---
  finalTeamSlots.forEach((slot, index) => {
    if (!slot.substitute) {
        const fallbackCandidates = allPlayerCandidates.sort(sortFunction);
        const fallbackPlayer = findBestPlayer(fallbackCandidates);
        
        if (fallbackPlayer) {
            usedPlayerIds.add(fallbackPlayer.player.id);
            usedCardIds.add(fallbackPlayer.card.id);
            slot.substitute = createTeamPlayer(fallbackPlayer, formation.slots[index].position);
        }
    }
  });


  const placeholderPerformance: PlayerPerformance = {
        stats: { average: 0, matches: 0, stdDev: 0 },
        isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false
  };

  return finalTeamSlots.map((slot, index) => {
    const formationSlot = formation.slots[index];
    const assignedPosition = formationSlot.position;

    const placeholderPlayer = {
        player: { id: `placeholder-S-${index}`, name: `Vacante`, cards: [], nationality: 'Sin Nacionalidad' as Nationality },
        card: { id: `placeholder-card-S-${index}`, name: 'N/A', style: 'Ninguno' as PlayerStyle, ratingsByPosition: {} },
        position: assignedPosition,
        assignedPosition: assignedPosition,
        average: 0,
        affinityScore: 0,
        generalScore: 0,
        performance: placeholderPerformance
    };

    return {
      starter: slot.starter || { ...placeholderPlayer, player: {...placeholderPlayer.player, id: `placeholder-S-${index}`}, card: {...placeholderPlayer.card, id: `placeholder-card-S-${index}`} },
      substitute: slot.substitute || { ...placeholderPlayer, player: {...placeholderPlayer.player, id: `placeholder-SUB-${index}`}, card: {...placeholderPlayer.card, id: `placeholder-card-SUB-${index}`} }
    };
  });
}
