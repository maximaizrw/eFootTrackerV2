import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot, IdealRoleBuild } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateRoleRating, calculateOverall, calculateRecencyWeightedAverage, positionPriority, resolveIdealBuild, calculateFinalStats } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  roleRating: number;
  overall: number;
  scoreForSelection: number;
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
  selectionCriteria: 'overall' | 'average' = 'overall',
  idealBuilds: IdealRoleBuild[] = []
): IdealTeamSlot[] {
  
  // Create sorted list of candidates once
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    // 1. Filter by nationality
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    // 2. STRICT RESTRICTION: D or E live updates are NEVER selectable
    if (player.liveUpdateRating === 'D' || player.liveUpdateRating === 'E') return [];
    
    return (player.cards || []).flatMap(card => {
      // 3. Filter by league and manual discards
      if (league !== 'all' && card.league !== league) return [];
      if (discardedCardIds.has(card.id)) return [];
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentAverage = calculateRecencyWeightedAverage(ratings, 5, 2.5, 0.9);
        
        const availableStylesForPos = getAvailableStylesForPosition(pos, false);
        const effectiveRole = availableStylesForPos.includes(card.style) ? card.style : 'Ninguno';
        
        const idealBuild = resolveIdealBuild(pos, effectiveRole, idealBuilds);
        const buildForPos = card.buildsByPosition?.[pos] || {};
        const effectiveStats = calculateFinalStats(card.attributeStats || {}, buildForPos);
        const roleRating = calculateRoleRating(effectiveStats, card.skills || [], idealBuild);
        
        const trueOverall = calculateOverall(roleRating, stats.average, stats.matches, player.liveUpdateRating, recentAverage);
        const scoreForSelection = selectionCriteria === 'average'
            ? stats.average
            : trueOverall;

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && (calculateStats(ratings.slice(-5)).average > stats.average + 0.5),
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: Object.keys(card.ratingsByPosition).length >= 3,
        };

        return { 
            player, card, position: pos, average: stats.average, 
            roleRating, overall: trueOverall, scoreForSelection,
            performance 
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  
  const candidateSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (Math.abs(b.scoreForSelection - a.scoreForSelection) > 0.001) return b.scoreForSelection - a.scoreForSelection;
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
        if (!targetPositions.includes(p.position)) return false;

        // 2. Secondary Position Check (Strict: player must have ratings in BOTH positions)
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

  // Sort formation slots based on target priority: PT, DFC, LI/LD, MCD, MC, MDI/MDD, MO, EXI/EXD, SD, DC
  const sortedFormationSlots = [...formation.slots].sort((a, b) => positionPriority[a.position] - positionPriority[b.position]);

  // 1. ASSIGN STARTERS (Respecting tactical order)
  const starters: (IdealTeamPlayer | null)[] = formation.slots.map(slot => {
    const candidates = getCandidatesForSlot(slot);
    const starter = candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id));

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
        return { ...starter, assignedPosition: slot.profileName || slot.position } as IdealTeamPlayer;
    }
    return null;
  });

  // 2. ASSIGN BENCH (Strictly following formation positions for 12 slots)
  // We go through the sorted slots to pick backups in priority order
  const benchAssignments: (IdealTeamPlayer | null)[] = [];
  
  // First pass: try to get a direct backup for every slot in priority order
  for (const slot of sortedFormationSlots) {
    if (benchAssignments.length >= 12) break;
    const candidates = getCandidatesForSlot(slot);
    const backup = candidates.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id));
    if (backup) {
        usedPlayerIds.add(backup.player.id);
        usedCardIds.add(backup.card.id);
        benchAssignments.push({ ...backup, assignedPosition: slot.profileName || slot.position } as IdealTeamPlayer);
    }
  }

  // Second pass: if bench is not full, add remaining best players that fit ANY formation position
  if (benchAssignments.length < 12) {
    const formationPositions = formation.slots.map(s => s.position);
    const remainingCandidates = allPlayerCandidates
        .filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id))
        .filter(p => formationPositions.includes(p.position))
        .sort(candidateSort);
    
    for (const p of remainingCandidates) {
        if (benchAssignments.length >= 12) break;
        usedPlayerIds.add(p.player.id);
        usedCardIds.add(p.card.id);
        benchAssignments.push({ ...p, assignedPosition: p.position } as IdealTeamPlayer);
    }
  }

  const placeholder = (id: string, pos: string) => ({ 
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: pos as any, assignedPosition: pos, average: 0, roleRating: 0, overall: 0, 
      performance: { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false } 
  } as IdealTeamPlayer);

  // Map everything back to IdealTeamSlot[]
  return Array.from({ length: 12 }).map((_, i) => {
    return {
        starter: i < 11 ? (starters[i] || placeholder(`ph-s-${i}`, formation.slots[i].profileName || formation.slots[i].position)) : null,
        substitute: benchAssignments[i] || (i < 12 ? placeholder(`ph-sub-${i}`, 'Suplente') : null)
    };
  });
}
