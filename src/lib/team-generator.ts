import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot, PlayerStyle, IdealTeamMode, IdealTeamSelectionCriteria } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateOverall, calculateRecencyWeightedAverage, positionPriority, calculatePlayerConfidence, normalizePlayerTier, getRatingEntriesForPosition, getFormationRatingEntries, calculateFormationConfidence, getCardTierForPosition, getCardTierPlacementsForPosition, getPlayerTierBonus } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  overall: number;
  generalConfidenceScore: number;
  scoreForSelection: number;
  position: Position;
  role: PlayerStyle;
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
  selectionCriteria: IdealTeamSelectionCriteria = 'overall',
  mode: IdealTeamMode = 'event'
): IdealTeamSlot[] {
  
  // Create sorted list of candidates once
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    // 1. Filter by nationality
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    // 2. League teams keep the form restriction; events can include any live update letter.
    if (mode !== 'event' && (player.liveUpdateRating === 'D' || player.liveUpdateRating === 'E')) return [];
    
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
        
        const likesForPos = card.likesByPosition?.[pos] || [];
        const likes = likesForPos.filter(l => l === true).length;
        const dislikes = likesForPos.filter(l => l === false).length;
        const tier = getCardTierForPosition(card, pos);
        const tierPlacements = getCardTierPlacementsForPosition(card, pos);
        if (mode === 'league' && ['SIN TIER', 'B', 'C', 'D', 'E'].includes(normalizePlayerTier(tier))) return null;

        const generalEntries = getRatingEntriesForPosition(card, pos);
        const formationEntries = getFormationRatingEntries(card, pos, formation.id);
        const formationConfidence = calculateFormationConfidence(generalEntries, formationEntries, player.liveUpdateRating);

        const trueOverall = calculateOverall(stats.average, stats.matches, likes, dislikes, player.liveUpdateRating, recentAverage, tier, tierPlacements);
        
        const confidence = calculatePlayerConfidence(stats.average, stats.matches, stats.stdDev, likes, dislikes, player.liveUpdateRating, recentAverage);
        const tierBonus = getPlayerTierBonus(tier, tierPlacements);
        const tierAdjustedGeneralConfidence = confidence.score + tierBonus;
        let scoreForSelection = trueOverall;
        if (selectionCriteria === 'average') {
            scoreForSelection = stats.average;
        } else if (selectionCriteria === 'confidence') {
            scoreForSelection = formationConfidence.score;
        } else if (selectionCriteria === 'general-confidence') {
            scoreForSelection = tierAdjustedGeneralConfidence;
        }

        const performance: PlayerPerformance = {
            stats,
            recentAverage: confidence.recentAverage,
            confidenceScore: formationConfidence.score,
            trendDelta: formationConfidence.trendDelta,
            formationMatches: formationConfidence.formationMatches,
            usesFormationContext: formationConfidence.usesFormationContext,
            tag: formationConfidence.tag,
            isHotStreak: formationConfidence.tag === 'racha',
            isConsistent: formationConfidence.tag === 'fijo' || formationConfidence.tag === 'estable',
            isPromising: formationConfidence.tag === 'promesa',
            isVersatile: Object.keys(card.ratingsByPosition).length >= 3,
        };

        return {
            player, card, position: pos, average: stats.average,
            overall: trueOverall, generalConfidenceScore: tierAdjustedGeneralConfidence, scoreForSelection,
            role: effectiveRole,
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

  const getCandidatesForSlot = (slot: FormationSlot, ignoreStyles = false): CandidatePlayer[] => {
    const primaryPos = slot.position;
    const secondaryPos = slot.secondaryPosition;
    const minHeight = slot.minHeight;
    
    let targetPositions: Position[] = [primaryPos];
    if (isFlexibleLaterals && (primaryPos === 'LI' || primaryPos === 'LD')) targetPositions = ['LI', 'LD'];
    if (isFlexibleWingers && (primaryPos === 'EXI' || primaryPos === 'EXD')) targetPositions = ['EXI', 'EXD'];
    
    const requiredStyles = slot.styles && slot.styles.length > 0 ? slot.styles : null;

    const baseFilter = (p: CandidatePlayer) => {
        if (!targetPositions.includes(p.position)) return false;
        if (secondaryPos) {
            const hasSecondaryRating = p.card.ratingsByPosition &&
                                       p.card.ratingsByPosition[secondaryPos] &&
                                       p.card.ratingsByPosition[secondaryPos]!.length > 0;
            if (!hasSecondaryRating) return false;
        }
        if (minHeight) {
            const playerHeight = p.card.physicalAttributes?.height || 0;
            if (playerHeight < minHeight) return false;
        }
        return true;
    };

    if (requiredStyles && !ignoreStyles) {
        const wantsNinguno = requiredStyles.includes('Ninguno');
        const specificStyles = requiredStyles.filter(s => s !== 'Ninguno');

        const matchesRole = (p: CandidatePlayer) => {
            if (specificStyles.includes(p.role)) return true;
            if (wantsNinguno) {
                // "Ninguno" = player's style is not a valid role for this position
                const validForPos = getAvailableStylesForPosition(p.position, false);
                return !validForPos.includes(p.role as any);
            }
            return false;
        };

        const withRole = allPlayerCandidates.filter(p => baseFilter(p) && matchesRole(p));
        if (withRole.length > 0) return withRole.sort(candidateSort);
    }

    return allPlayerCandidates.filter(baseFilter).sort(candidateSort);
  };

  // Sort formation slots based on target priority: PT, DFC, LI/LD, MCD, MC, MDI/MDD, MO, EXI/EXD, SD, DC
  const sortedFormationSlots = formation.slots
    .map((slot, originalIndex) => ({ slot, originalIndex }))
    .sort((a, b) => positionPriority[a.slot.position] - positionPriority[b.slot.position]);

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

  // 2. ASSIGN BENCH — prioritized "player testers": candidates with < 5 matches in the position.
  // When no testers are left, select the best players in that position.
  // Slots 1-11 follow position order and keep empty slots in place.
  // Slot 12 is an extra player (tester or best remaining) appended at the very end.
  const isTester = (p: CandidatePlayer) => p.performance.stats.matches < 5;

  const benchAssignments: (IdealTeamPlayer | null)[] = Array(11).fill(null);
  const usedPlayerIdsForBench = new Set<string>(usedPlayerIds);
  const usedCardIdsForBench = new Set<string>(usedCardIds);

  // First pass: one backup per formation slot in position order, testers preferred, then best available.
  for (let i = 0; i < sortedFormationSlots.length && i < 11; i++) {
    const { slot, originalIndex } = sortedFormationSlots[i];
    const starterRole = starters[originalIndex]?.role;
    const isAvailable = (p: CandidatePlayer) =>
      !usedPlayerIdsForBench.has(p.player.id) &&
      !usedCardIdsForBench.has(p.card.id) &&
      !usedPlayerIds.has(p.player.id);

    let backup: CandidatePlayer | undefined;

    // Priority 1: same role as the starter (only if formation specifies styles, tester preferred)
    const slotRequiresStyles = slot.styles && slot.styles.length > 0;
    if (slotRequiresStyles && starterRole && starterRole !== 'Ninguno') {
      const sameRoleCandidates = getCandidatesForSlot({ ...slot, styles: [starterRole] });
      backup = sameRoleCandidates.find(p => isTester(p) && isAvailable(p))
             ?? sameRoleCandidates.find(isAvailable);
    }

    // Priority 2: slot's required styles (tester preferred)
    if (!backup) {
      const candidates = getCandidatesForSlot(slot);
      backup = candidates.find(p => isTester(p) && isAvailable(p))
             ?? candidates.find(isAvailable);
    }

    // Last resort: ignore styles, any position match
    if (!backup) {
      const fallbackCandidates = getCandidatesForSlot(slot, true);
      backup = fallbackCandidates.find(p => isTester(p) && isAvailable(p))
             ?? fallbackCandidates.find(isAvailable);
    }

    if (backup) {
      usedPlayerIdsForBench.add(backup.player.id);
      usedCardIdsForBench.add(backup.card.id);
      benchAssignments[i] = { ...backup, assignedPosition: slot.profileName || slot.position } as IdealTeamPlayer;
    }
  }

  // Slot 12: extra tester or best remaining — any position, same role criteria as bench slots 1-11
  let extraBenchAssignment: IdealTeamPlayer | null = null;
  {
    const isAvailableForExtra = (p: CandidatePlayer) =>
      !usedPlayerIdsForBench.has(p.player.id) &&
      !usedCardIdsForBench.has(p.card.id) &&
      !usedPlayerIds.has(p.player.id);

    const seenPlayerIdsForExtra = new Set<string>();
    const seenCardIdsForExtra = new Set<string>();
    const allRemainingCandidates: CandidatePlayer[] = [];

    // For each slot, apply the same role priority as the bench assignment
    for (let i = 0; i < sortedFormationSlots.length; i++) {
      const { slot, originalIndex } = sortedFormationSlots[i];
      const starterRole = starters[originalIndex]?.role;
      const slotRequiresStyles = slot.styles && slot.styles.length > 0;

      let candidates: CandidatePlayer[];
      if (slotRequiresStyles && starterRole && starterRole !== 'Ninguno') {
        // Same role as the starter (only if formation specifies styles)
        candidates = getCandidatesForSlot({ ...slot, styles: [starterRole] });
        // Fallback: slot's required styles
        if (candidates.filter(isAvailableForExtra).length === 0) {
          candidates = getCandidatesForSlot(slot);
        }
      } else {
        candidates = getCandidatesForSlot(slot);
      }

      for (const p of candidates) {
        if (
          isAvailableForExtra(p) &&
          !seenCardIdsForExtra.has(p.card.id) &&
          !seenPlayerIdsForExtra.has(p.player.id)
        ) {
          allRemainingCandidates.push(p);
          seenCardIdsForExtra.add(p.card.id);
          seenPlayerIdsForExtra.add(p.player.id);
        }
      }
    }

    allRemainingCandidates.sort(candidateSort);

    // Tester first, then best available — regardless of position
    const extra = allRemainingCandidates.find(isTester) ?? allRemainingCandidates[0];

    if (extra) {
      extraBenchAssignment = { ...extra, assignedPosition: extra.position } as IdealTeamPlayer;
    }
  }

  // Safety dedup: clear any bench player whose player ID is already in starters without shifting slots.
  const starterPlayerIds = new Set(starters.filter(Boolean).map(s => s!.player.id));
  const safeBenchAssignments = benchAssignments.map(b => b && !starterPlayerIds.has(b.player.id) ? b : null);
  const safeExtraBenchAssignment = extraBenchAssignment && !starterPlayerIds.has(extraBenchAssignment.player.id) ? extraBenchAssignment : null;

  const placeholder = (id: string, assignedPosition: string, position: string = assignedPosition) => ({
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: position as any, assignedPosition, role: 'Ninguno', average: 0, overall: 0,
      generalConfidenceScore: 0,
      performance: { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false } 
  } as IdealTeamPlayer);

  // Map everything back to IdealTeamSlot[]
  return Array.from({ length: 12 }).map((_, i) => {
    const benchSlot = i < 11 ? sortedFormationSlots[i]?.slot : null;
    const benchPosition = benchSlot ? (benchSlot.profileName || benchSlot.position) : 'Suplente';
    const starterSlot = i < 11 ? formation.slots[i] : null;

    return {
        starter: starterSlot ? (starters[i] || placeholder(`ph-s-${i}`, starterSlot.profileName || starterSlot.position, starterSlot.position)) : null,
        substitute: i < 11
          ? (safeBenchAssignments[i] || placeholder(`ph-sub-${i}`, benchPosition, benchSlot?.position || benchPosition))
          : (safeExtraBenchAssignment || placeholder(`ph-sub-${i}`, 'Suplente'))
    };
  });
}
