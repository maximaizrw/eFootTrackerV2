
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, PlayerAttribute } from './types';
import { calculateStats, getAffinityScoreForPosition } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  generalScore: number;
  position: Position;
  performance: PlayerPerformance;
};


/**
 * Generates the ideal team (starters and substitutes) based on a given formation.
 * 
 * @param players - The list of all available players.
 * @param formation - The selected formation with defined slots.
 * @param idealBuilds - The map of ideal statistics for each position.
 * @param discardedCardIds - A set of card IDs to exclude from the selection.
 * @param league - The league to filter by.
 * @param nationality - The nationality to filter by.
 * @param sortBy - The metric to sort players by ('average' or 'general').
 * @returns An array of 11 slots, each with a starter and a substitute.
 */
export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  idealBuilds: Record<Position, Partial<Record<PlayerAttribute, number>>>,
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  sortBy: 'average' | 'general' = 'average'
): IdealTeamSlot[] {
  
  const hasFilters = league !== 'all' || nationality !== 'all';
  
  // Create a flat list of all possible player-card-position combinations
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    // Filter by nationality if a specific one is selected
    if (nationality !== 'all' && player.nationality !== nationality) {
      return [];
    }

    return (player.cards || []).flatMap(card => {
      // Filter by league if a specific league is selected
      if (league !== 'all' && card.league !== league) {
        return [];
      }

      const highPerfPositions = new Set<Position>();
      for (const p in card.ratingsByPosition) {
          const positionKey = p as Position;
          const posRatings = card.ratingsByPosition[positionKey];
          if (posRatings && posRatings.length > 0) {
              const posAvg = calculateStats(posRatings).average;
              if (posAvg >= 7.5) highPerfPositions.add(positionKey);
          }
      }
      const isVersatile = highPerfPositions.size >= 3;
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];
      const trainedPositions = card.statsBuilds ? Object.keys(card.statsBuilds).filter(p => card.statsBuilds![p as Position]?.stats && Object.keys(card.statsBuilds![p as Position]!.stats!).length > 0) as Position[] : [];
      const hasTrainingBuilds = trainedPositions.length > 0;

      // If a card has training builds, it can ONLY be selected for those trained positions.
      // Otherwise, it can be selected for any position it has ratings for.
      const eligiblePositions = hasTrainingBuilds ? trainedPositions : positionsWithRatings;


      return eligiblePositions.map(pos => {
        // A player with a build is always eligible for that position, but we still need to check if they have ratings.
        if (!card.ratingsByPosition?.[pos] || card.ratingsByPosition[pos]!.length === 0) {
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
            isPromising: stats.matches > 0 && stats.matches < 10,
            isVersatile: isVersatile,
        };

        const hasBuildForPos = !!(card.statsBuilds?.[pos]?.stats && Object.keys(card.statsBuilds[pos]!.stats!).length > 0);
        const affinityScore = hasBuildForPos ? getAffinityScoreForPosition(pos, card.statsBuilds![pos]!, idealBuilds[pos]) : 0;
        const matchAverageScore = (stats.average - 1) / 9 * 100; // Normalize 1-10 scale to 0-100
        
        const generalScore = (matchAverageScore * 0.5) + (affinityScore * 0.5);

        return {
          player,
          card,
          position: pos,
          average: stats.average,
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


  const createTeamPlayer = (candidate: CandidatePlayer | undefined, assignedPosition: Position | Position[]): IdealTeamPlayer | null => {
      if (!candidate) return null;
      return {
          player: candidate.player,
          card: candidate.card,
          position: candidate.position, // The actual position of the player's rating
          assignedPosition: assignedPosition, // The slot they were assigned to
          average: candidate.average,
          performance: candidate.performance,
      }
  }

  // Finds the best player from a list of candidates who hasn't been used yet.
  const findBestPlayer = (candidates: CandidatePlayer[]): CandidatePlayer | undefined => {
      return candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id));
  };
  
  // --- STARTER SELECTION ---
  for (const formationSlot of formation.slots) {
    const hasStylePreference = formationSlot.styles && formationSlot.styles.length > 0;
    const targetPositions = Array.isArray(formationSlot.position) ? formationSlot.position : [formationSlot.position];
    
    // Get all candidates for the specific position(s), sorted by the chosen metric.
    const positionCandidates = allPlayerCandidates
      .filter(p => targetPositions.includes(p.position))
      .sort(sortFunction);

    let starterCandidate: CandidatePlayer | undefined;
    
    // 1. Try to find a player matching the preferred style.
    if (hasStylePreference) {
        const styleCandidates = positionCandidates.filter(p => formationSlot.styles!.includes(p.card.style));
        starterCandidate = findBestPlayer(styleCandidates);
    }
    
    // 2. Fallback: If no style-matching player is found, find the best overall for the position.
    if (!starterCandidate) {
        starterCandidate = findBestPlayer(positionCandidates);
    }
    
    if (starterCandidate) {
      usedPlayerIds.add(starterCandidate.player.id);
      usedCardIds.add(starterCandidate.card.id);
    }
    
    finalTeamSlots.push({
      starter: createTeamPlayer(starterCandidate, formationSlot.position),
      substitute: null, // Substitute will be found in the next loop
    });
  }
  
  // --- SUBSTITUTE SELECTION ---
  finalTeamSlots.forEach((slot, index) => {
    const formationSlot = formation.slots[index];
    const hasStylePreference = formationSlot.styles && formationSlot.styles.length > 0;
    const targetPositions = Array.isArray(formationSlot.position) ? formationSlot.position : [formationSlot.position];

    // Candidates for this position, already sorted.
    const positionCandidates = allPlayerCandidates
      .filter(p => targetPositions.includes(p.position))
      .sort(sortFunction);

    let substituteCandidate: CandidatePlayer | undefined;
    
    const findSubstitute = (candidates: CandidatePlayer[]) => {
        // Prioritize players with < 10 matches to test them
        const promising = candidates.filter(p => p.performance.isPromising);
        // Then players on a hot streak
        const hotStreaks = candidates.filter(p => p.performance.isHotStreak && !p.performance.isPromising);
        // Then the rest
        const others = candidates.filter(p => !p.performance.isPromising && !p.performance.isHotStreak);

        return findBestPlayer(promising) ||
               findBestPlayer(hotStreaks) || 
               findBestPlayer(others);
    }

    // Attempt to find a substitute with the preferred style first.
    if (hasStylePreference) {
        const styleCandidates = positionCandidates.filter(p => formationSlot.styles!.includes(p.card.style));
        substituteCandidate = findSubstitute(styleCandidates);
    }
    
    // Fallback: If no style match, find from the general pool for the position.
    if (!substituteCandidate) {
        substituteCandidate = findSubstitute(positionCandidates);
    }

    if (substituteCandidate) {
      usedPlayerIds.add(substituteCandidate.player.id);
      usedCardIds.add(substituteCandidate.card.id);
    }
    
    slot.substitute = createTeamPlayer(substituteCandidate, formationSlot.position);
  });

  // --- FALLBACK FOR EMPTY SUBSTITUTE SLOTS ---
  finalTeamSlots.forEach((slot, index) => {
    if (!slot.substitute) {
        // Find best available player from the correct filters who is not yet used, regardless of position
        const fallbackCandidates = allPlayerCandidates.sort(sortFunction);

        const fallbackPlayer = findBestPlayer(fallbackCandidates);
        
        if (fallbackPlayer) {
            usedPlayerIds.add(fallbackPlayer.player.id);
            usedCardIds.add(fallbackPlayer.card.id);
            // The assigned position is the original intended substitute position
            slot.substitute = createTeamPlayer(fallbackPlayer, formation.slots[index].position);
        }
    }
  });


  // Fill any empty slots with placeholders.
  const placeholderPerformance: PlayerPerformance = {
        stats: { average: 0, matches: 0, stdDev: 0 },
        isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false
  };

  return finalTeamSlots.map((slot, index) => {
    const formationSlot = formation.slots[index];
    const assignedPosition = formationSlot.position;

    return {
      starter: slot.starter || {
          player: { id: `placeholder-S-${index}`, name: `Vacante`, cards: [], nationality: 'Sin Nacionalidad' },
          card: { id: `placeholder-card-S-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
          position: Array.isArray(assignedPosition) ? assignedPosition[0] : assignedPosition,
          assignedPosition: assignedPosition,
          average: 0,
          performance: placeholderPerformance
      },
      substitute: slot.substitute || {
           player: { id: `placeholder-SUB-${index}`, name: `Vacante`, cards: [], nationality: 'Sin Nacionalidad' },
          card: { id: `placeholder-card-SUB-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
          position: Array.isArray(assignedPosition) ? assignedPosition[0] : assignedPosition,
          assignedPosition: assignedPosition,
          average: 0,
          performance: placeholderPerformance
      }
    };
  });
}
