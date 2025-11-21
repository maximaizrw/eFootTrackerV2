
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, PlayerStatsBuild } from './types';
import { calculateStats, getAffinityScoreFromBuild } from './utils';

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
 * @param idealBuilds - The ideal builds for each position.
 * @param discardedCardIds - A set of card IDs to exclude from the selection.
 * @param league - The league to filter by.
 * @param nationality - The nationality to filter by.
 * @param sortBy - The metric to sort players by ('average' or 'general').
 * @returns An array of 11 slots, each with a starter and a substitute.
 */
export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  idealBuilds: Record<Position, PlayerStatsBuild>,
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
        
        const idealBuild = idealBuilds[pos];
        const affinityScore = getAffinityScoreFromBuild(card.build, idealBuild);

        const matchAverageScore = stats.average > 0 ? (stats.average / 10 * 100) : 0;
        const generalScore = (affinityScore * 0.6) + (matchAverageScore * 0.4);

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


  const createTeamPlayer = (candidate: CandidatePlayer | undefined, assignedPosition: Position | Position[]): IdealTeamPlayer | null => {
      if (!candidate) return null;
      return {
          player: candidate.player,
          card: candidate.card,
          position: candidate.position,
          assignedPosition: assignedPosition,
          average: candidate.average,
          performance: candidate.performance,
      }
  }

  const findBestPlayer = (candidates: CandidatePlayer[]): CandidatePlayer | undefined => {
      return candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id));
  };
  
  // --- STARTER SELECTION ---
  for (const formationSlot of formation.slots) {
    const hasStylePreference = formationSlot.styles && formationSlot.styles.length > 0;
    const targetPositions = Array.isArray(formationSlot.position) ? formationSlot.position : [formationSlot.position];
    
    const positionCandidates = allPlayerCandidates
      .filter(p => targetPositions.includes(p.position))
      .sort(sortFunction);

    let starterCandidate: CandidatePlayer | undefined;
    
    if (hasStylePreference) {
        const styleCandidates = positionCandidates.filter(p => formationSlot.styles!.includes(p.card.style));
        starterCandidate = findBestPlayer(styleCandidates);
    }
    
    if (!starterCandidate) {
        starterCandidate = findBestPlayer(positionCandidates);
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
    const formationSlot = formation.slots[index];
    const hasStylePreference = formationSlot.styles && formationSlot.styles.length > 0;
    const targetPositions = Array.isArray(formationSlot.position) ? formationSlot.position : [formationSlot.position];

    const positionCandidates = allPlayerCandidates
      .filter(p => targetPositions.includes(p.position))
      .sort(sortFunction);

    let substituteCandidate: CandidatePlayer | undefined;
    
    const findSubstitute = (candidates: CandidatePlayer[]) => {
        const promising = candidates.filter(p => p.performance.isPromising);
        const hotStreaks = candidates.filter(p => p.performance.isHotStreak && !p.performance.isPromising);
        const others = candidates.filter(p => !p.performance.isPromising && !p.performance.isHotStreak);

        return findBestPlayer(promising) ||
               findBestPlayer(hotStreaks) || 
               findBestPlayer(others);
    }

    if (hasStylePreference) {
        const styleCandidates = positionCandidates.filter(p => formationSlot.styles!.includes(p.card.style));
        substituteCandidate = findSubstitute(styleCandidates);
    }
    
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
