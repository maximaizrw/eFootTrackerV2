
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, Tier } from './types';
import { calculateStats, calculateFinalScore, calculateRecencyWeightedAverage } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  score: number;
  tier: Tier;
  position: Position;
  performance: PlayerPerformance;
};

export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false,
  selectionCriteria: 'general' | 'average' = 'general',
  prioritizeRecentForm: boolean = false
): IdealTeamSlot[] {
  const formationPositions = new Set(formation.slots.map(s => s.position));
  
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) return [];
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentAverage = calculateRecencyWeightedAverage(ratings, 5, 2.5, 0.9);
        
        const manualTier: Tier = card.manualTiersByPosition?.[pos] || 'D';
        
        // If selection criteria is purely average, we ignore the Tier bonus base for the score
        const effectiveTier = selectionCriteria === 'average' ? 'D' : manualTier;
        const finalScore = calculateFinalScore(effectiveTier, stats.average, stats.matches, player.liveUpdateRating, recentAverage, prioritizeRecentForm);

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && (calculateStats(ratings.slice(-5)).average > stats.average + 0.5),
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: Object.keys(card.ratingsByPosition).length >= 3,
        };

        return { 
            player, card, position: pos, average: stats.average, 
            score: finalScore, tier: manualTier, 
            performance 
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const candidateSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    // Primary sort: Final Score
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    // Secondary sort: Number of matches (experience)
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const getCandidatesForSlot = (targetPosition: Position): CandidatePlayer[] => {
    let targetPositions: Position[] = [targetPosition];
    
    if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
    if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    
    return allPlayerCandidates
        .filter(p => targetPositions.includes(p.position))
        .sort(candidateSort);
  };

  // 1. STARTERS (11 positions from formation)
  for (const slot of formation.slots) {
    const candidates = getCandidatesForSlot(slot.position);
    const starter = candidates.find(p => 
        !usedPlayerIds.has(p.player.id) && 
        !usedCardIds.has(p.card.id) && 
        !discardedCardIds.has(p.card.id)
    );

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    finalTeamSlots.push({ starter: starter ? { ...starter, assignedPosition: slot.position } as any : null, substitute: null });
  }
  
  // 2. SUBSTITUTES (12 spots for testing/backup)
  // Logic: Candidates that can play in ANY of the formation's positions, prioritized by score.
  const eligibleSubsList = allPlayerCandidates
    .filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id))
    .filter(p => formationPositions.has(p.position))
    .sort(candidateSort);

  let subIndex = 0;
  for (let i = 0; i < 12; i++) {
      const candidate = eligibleSubsList[subIndex];
      if (candidate) {
          usedPlayerIds.add(candidate.player.id);
          usedCardIds.add(candidate.card.id);
          if (i < finalTeamSlots.length) {
              finalTeamSlots[i].substitute = { ...candidate, assignedPosition: candidate.position } as any;
          } else {
              finalTeamSlots.push({ starter: null, substitute: { ...candidate, assignedPosition: candidate.position } as any });
          }
          subIndex++;
      }
  }

  // Placeholder generator for empty slots
  const ph = (id: string, pos: Position) => ({ 
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: pos, assignedPosition: pos, average: 0, tier: 'D', score: 0, 
      performance: { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false } 
  } as any);

  // Return exactly 12 slots (the component will map them)
  return Array.from({ length: Math.max(11, finalTeamSlots.length) }).map((_, i) => {
    const slot = finalTeamSlots[i] || { starter: null, substitute: null };
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`, assigned) : null), 
        substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`, assigned) : null)
    };
  });
}
