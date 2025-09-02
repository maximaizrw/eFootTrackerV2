
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance } from './types';
import { calculateStats } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  position: Position;
  performance: PlayerPerformance;
};


/**
 * Generates the ideal team (starters and substitutes) based on a given formation.
 * 
 * @param players - The list of all available players.
 * @param formation - The selected formation with defined slots.
 * @param discardedCardIds - A set of card IDs to exclude from the selection.
 * @returns An array of 11 slots, each with a starter and a substitute.
 */
export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  discardedCardIds: Set<string> = new Set()
): IdealTeamSlot[] {
  
  // Create a flat list of all possible player-card-position combinations
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player =>
    (player.cards || []).flatMap(card => {
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

      return positionsWithRatings.map(pos => {
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

        return {
          player,
          card,
          position: pos,
          average: stats.average,
          performance: performance,
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  );

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];

  const createTeamPlayer = (candidate: CandidatePlayer | undefined, assignedPosition: Position): IdealTeamPlayer | null => {
      if (!candidate) return null;
      return {
          player: candidate.player,
          card: candidate.card,
          position: assignedPosition,
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
    
    // Get all candidates for the specific position, sorted by average rating.
    const positionCandidates = allPlayerCandidates
      .filter(p => p.position === formationSlot.position)
      .sort((a, b) => b.average - a.average);

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

    // Candidates for this position, already sorted by average rating.
    const positionCandidates = allPlayerCandidates
      .filter(p => p.position === formationSlot.position)
      .sort((a, b) => b.average - a.average);

    let substituteCandidate: CandidatePlayer | undefined;
    
    const findSubstitute = (candidates: CandidatePlayer[]) => {
        const hotStreaks = candidates.filter(p => p.performance.isHotStreak);
        const promising = candidates.filter(p => p.performance.isPromising);
        const others = candidates.filter(p => !p.performance.isHotStreak && !p.performance.isPromising);

        return findBestPlayer(hotStreaks) || 
               findBestPlayer(promising) ||
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

  // Fill any empty slots with placeholders.
  const placeholderPerformance: PlayerPerformance = {
        stats: { average: 0, matches: 0, stdDev: 0 },
        isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false
  };

  return finalTeamSlots.map((slot, index) => {
    const formationSlot = formation.slots[index];
    return {
      starter: slot.starter || {
          player: { id: `placeholder-S-${index}`, name: `Vacante`, cards: [] },
          card: { id: `placeholder-card-S-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
          position: formationSlot.position,
          average: 0,
          performance: placeholderPerformance
      },
      substitute: slot.substitute || {
           player: { id: `placeholder-SUB-${index}`, name: `Vacante`, cards: [] },
          card: { id: `placeholder-card-SUB-${index}`, name: 'N/A', style: 'Ninguno', ratingsByPosition: {} },
          position: formationSlot.position,
          average: 0,
          performance: placeholderPerformance
      }
    };
  });
}
