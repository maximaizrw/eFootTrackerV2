import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, Tier, FormationSlot } from './types';
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
  const formationPositions = formation.slots.map(s => s.position);
  
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) return [];
      if (discardedCardIds.has(card.id)) return [];
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentAverage = calculateRecencyWeightedAverage(ratings, 5, 2.5, 0.9);
        
        const manualTier: Tier = card.manualTiersByPosition?.[pos] || 'D';
        
        const scoreForSelection = selectionCriteria === 'average'
            ? stats.average
            : calculateFinalScore(manualTier, stats.average, stats.matches, player.liveUpdateRating, recentAverage, prioritizeRecentForm);

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && (calculateStats(ratings.slice(-5)).average > stats.average + 0.5),
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: Object.keys(card.ratingsByPosition).length >= 3,
        };

        return { 
            player, card, position: pos, average: stats.average, 
            score: scoreForSelection, tier: manualTier, 
            performance 
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  
  const candidateSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const getCandidatesForSlot = (slot: FormationSlot): CandidatePlayer[] => {
    const primaryPos = slot.position;
    const secondaryPos = slot.secondaryPosition;
    const minHeight = slot.minHeight;
    
    let targetPositions: Position[] = [primaryPos];
    if (isFlexibleLaterals && (primaryPos === 'LI' || primaryPos === 'LD')) targetPositions = ['LI', 'LD'];
    if (isFlexibleWingers && (primaryPos === 'EXI' || primaryPos === 'EXD')) targetPositions = ['EXI', 'EXD'];
    
    return allPlayerCandidates.filter(p => {
        // 1. Primary Position Check (with flexibility)
        let primaryMatches = targetPositions.includes(p.position);
        if (!primaryMatches) return false;

        // 2. Secondary Position Check (Strict: card must have both loaded)
        if (secondaryPos) {
            const hasSecondaryRating = p.card.ratingsByPosition && 
                                       p.card.ratingsByPosition[secondaryPos] && 
                                       p.card.ratingsByPosition[secondaryPos]!.length > 0;
            if (!hasSecondaryRating) return false;
        }

        // 3. Min Height Check
        if (minHeight) {
            const playerHeight = p.card.physicalAttributes?.height || 0;
            if (playerHeight < minHeight) return false;
        }

        return true;
    }).sort(candidateSort);
  };

  // 1. ASIGNAR TITULARES
  const tempStarters: (IdealTeamPlayer | null)[] = formation.slots.map(slot => {
    const candidates = getCandidatesForSlot(slot);
    const starter = candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id));

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
        return { ...starter, assignedPosition: slot.profileName || slot.position } as any;
    }
    return null;
  });

  // 2. ASIGNAR SUPLENTES (Directos por posición de la formación para rotación coherente)
  const tempSubs: (IdealTeamPlayer | null)[] = formation.slots.map((slot, index) => {
    const candidates = getCandidatesForSlot(slot);
    const sub = candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id));

    if (sub) {
        usedPlayerIds.add(sub.player.id);
        usedCardIds.add(sub.card.id);
        return { ...sub, assignedPosition: slot.profileName || slot.position } as any;
    }
    return null;
  });

  // 3. COMPLETAR HASTA 12 SUPLENTES (Relleno con mejores restantes que encajen en CUALQUIER puesto de la formación)
  const eligibleExtraSubs = allPlayerCandidates
    .filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id))
    .filter(p => formationPositions.includes(p.position))
    .sort(candidateSort);

  const extraSubs = eligibleExtraSubs.slice(0, 12 - tempSubs.filter(s => s !== null).length);
  const finalSubs = [...tempSubs.filter(s => s !== null), ...extraSubs].slice(0, 12);

  const ph = (id: string, pos: string) => ({ 
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: pos as any, assignedPosition: pos, average: 0, tier: 'D', score: 0, 
      performance: { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false } 
  } as any);

  return Array.from({ length: 11 }).map((_, i) => {
    const slot = formation.slots[i];
    return {
        starter: tempStarters[i] || ph(`ph-s-${i}`, slot.profileName || slot.position),
        substitute: finalSubs[i] || (i < finalSubs.length ? null : ph(`ph-sub-${i}`, slot.profileName || slot.position))
    };
  }).concat(finalSubs.length > 11 ? [{ starter: null, substitute: finalSubs[11] }] : []);
}