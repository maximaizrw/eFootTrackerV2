import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType } from './types';
import { calculateStats, calculateTierInfo, calculateRecencyWeightedAverage } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  score: number;
  tier: string;
  position: Position;
  performance: PlayerPerformance;
};

const tierRank: Record<string, number> = { 'S+': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };

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
        const tierInfo = calculateTierInfo(stats.average, stats.matches, player.liveUpdateRating, recentAverage, prioritizeRecentForm);

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && (calculateStats(ratings.slice(-5)).average > stats.average + 0.5),
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: Object.keys(card.ratingsByPosition).length >= 3,
        };

        return { 
            player, card, position: pos, average: stats.average, 
            score: tierInfo.score, tier: tierInfo.tier, 
            performance 
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const candidateSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    const rankA = tierRank[a.tier] || 0;
    const rankB = tierRank[b.tier] || 0;
    if (rankA !== rankB) return rankB - rankA;
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const getCandidatesForSlot = (formationSlot: FormationSlotType): CandidatePlayer[] => {
    const targetPosition = formationSlot.position;
    let targetPositions: Position[] = [targetPosition];
    
    if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
    if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    
    return allPlayerCandidates
        .filter(p => targetPositions.includes(p.position))
        .sort(candidateSort);
  };

  // 1. STARTERS
  for (const slot of formation.slots) {
    let cand = getCandidatesForSlot(slot);
    let starter = cand.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id));

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    finalTeamSlots.push({ starter: starter ? { ...starter, assignedPosition: slot.position } as any : null, substitute: null });
  }
  
  // 2. SUBSTITUTES (Priority: lowest matches first among eligible positions)
  const eligibleSubsList = allPlayerCandidates
    .filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id))
    .filter(p => formationPositions.has(p.position))
    .filter(p => p.average > 6.0 || p.performance.stats.matches < 5)
    .sort((a, b) => a.performance.stats.matches - b.performance.stats.matches || candidateSort(a, b));

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

  const ph = (id: string, pos: Position) => ({ 
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: pos, assignedPosition: pos, average: 0, tier: 'D', score: 0, 
      performance: { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false } 
  } as any);

  return finalTeamSlots.slice(0, 12).map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`, assigned) : null), 
        substitute: slot.substitute || ph(`ph-sub-${i}`, assigned) 
    };
  });
}
