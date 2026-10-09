import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot, PlayerStyle, IdealTeamMode, IdealTeamSelectionCriteria, IdealTeamCardFilter } from './types';
import { getFormationSlotStyles, getPlayerStyleForPosition } from './types';
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

type FormationSelectionSlot = FormationSlot & {
  requiredPositions: Position[];
  defensivePosition?: Position;
  defensiveStyles: string[];
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
  mode: IdealTeamMode = 'event',
  cardFilter: IdealTeamCardFilter = 'all'
): IdealTeamSlot[] {
  const meetsTierRequirement = (card: PlayerCard, position: Position) => {
    const tier = normalizePlayerTier(card.tierByPosition?.[position] ?? card.tier);
    return mode === 'league' ? ['A', 'S', 'S+'].includes(tier) : tier !== 'SIN TIER';
  };
  
  // Create sorted list of candidates once
  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    // 1. Filter by nationality
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    // 2. League teams keep the form restriction; events can include any live update letter.
    if (mode !== 'event' && (player.liveUpdateRating === 'D' || player.liveUpdateRating === 'E')) return [];
    
    return (player.cards || []).flatMap(card => {
      // 3. Filter by league and manual discards
      if (league !== 'all' && card.league !== league) return [];
      if (cardFilter === 'POTW' && !card.name.toUpperCase().includes('POTW')) return [];
      if (discardedCardIds.has(card.id)) return [];
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        if (card.secondaryPositions?.includes(pos)) return null;
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentAverage = calculateRecencyWeightedAverage(ratings, 5, 2.5, 0.9);
        
        const offensiveStyle = getPlayerStyleForPosition(card, pos, 'offensive');
        
        const likesForPos = card.likesByPosition?.[pos] || [];
        const likes = likesForPos.filter(l => l === true).length;
        const dislikes = likesForPos.filter(l => l === false).length;
        const tier = getCardTierForPosition(card, pos);
        const tierPlacements = getCardTierPlacementsForPosition(card, pos);

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
        } else if (selectionCriteria === 'tier') {
            scoreForSelection = tierBonus;
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
            role: offensiveStyle as PlayerStyle,
            performance
        };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();

  // In a fluid formation, every index represents the same player in both phases.
  // Keep the offensive slot as the displayed/rated position, but require the card
  // to also be usable in the corresponding defensive position.
  const selectionSlots: FormationSelectionSlot[] = formation.slots.map((slot, index) => {
    const defensiveSlot = formation.isFluid ? formation.defensiveSlots?.[index] : undefined;
    const defensivePosition = defensiveSlot?.position;
    const requiredPositions = [slot.secondaryPosition, defensivePosition]
      .filter((position): position is Position => Boolean(position) && position !== slot.position)
      .filter((position, positionIndex, positions) => positions.indexOf(position) === positionIndex);

    return {
      ...slot,
      ...getFormationSlotStyles(slot, formation.isFluid, defensiveSlot),
      requiredPositions,
      defensivePosition,
    };
  });
  
  const candidateSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (Math.abs(b.scoreForSelection - a.scoreForSelection) > 0.001) return b.scoreForSelection - a.scoreForSelection;
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const meetsSlotTierRequirement = (p: CandidatePlayer, slot: FormationSelectionSlot) =>
    [p.position, ...slot.requiredPositions].every(position => meetsTierRequirement(p.card, position));

  const getCandidatesForSlot = (slot: FormationSelectionSlot, ignoreStyles = false, allowTierFallback = false): CandidatePlayer[] => {
    const primaryPos = slot.position;
    const minHeight = slot.minHeight;
    
    let targetPositions: Position[] = [primaryPos];
    if (isFlexibleLaterals && (primaryPos === 'LI' || primaryPos === 'LD')) targetPositions = ['LI', 'LD'];
    if (isFlexibleWingers && (primaryPos === 'EXI' || primaryPos === 'EXD')) targetPositions = ['EXI', 'EXD'];
    
    // A player has one offensive and one defensive style per position. When a
    // slot has several accepted styles, matching any one of them is enough.
    const selectedOffensiveStyles = slot.offensiveStyles || slot.styles || [];
    const requiredStyles = selectedOffensiveStyles.length > 0 ? selectedOffensiveStyles : null;
    const requiredDefensiveStyles = slot.defensiveStyles.length > 0 ? slot.defensiveStyles : null;

    const baseFilter = (p: CandidatePlayer) => {
        if (!targetPositions.includes(p.position)) return false;
        if (!allowTierFallback && !meetsSlotTierRequirement(p, slot)) return false;
        const hasAllRequiredPositions = slot.requiredPositions.every(position =>
            (p.card.ratingsByPosition?.[position]?.length ?? 0) > 0 ||
            Boolean(p.card.secondaryPositions?.includes(position))
        );
        if (!hasAllRequiredPositions) return false;
        if (minHeight) {
            const playerHeight = p.card.physicalAttributes?.height || 0;
            if (playerHeight < minHeight) return false;
        }
        return true;
    };

    const matchesOffensiveStyles = (p: CandidatePlayer) => {
        if (!requiredStyles) return true;
        const wantsNinguno = requiredStyles.includes('Ninguno');
        const specificStyles = requiredStyles.filter(s => s !== 'Ninguno');

        if (specificStyles.includes(p.role)) return true;
        if (wantsNinguno) return p.role === 'Ninguno';
        return false;
    };

    const matchesDefensiveStyles = (p: CandidatePlayer) => {
        if (!requiredDefensiveStyles) return true;
        const defensiveRole = getPlayerStyleForPosition(p.card, slot.defensivePosition ?? p.position, 'defensive');
        return requiredDefensiveStyles.includes(defensiveRole);
    };

    return allPlayerCandidates
      .filter(p => baseFilter(p) && (ignoreStyles || (matchesOffensiveStyles(p) && matchesDefensiveStyles(p))))
      .sort(candidateSort);
  };

  // Sort formation slots based on target priority: PT, DFC, LI/LD, MCD, MC, MDI/MDD, MO, EXI/EXD, SD, DC
  const sortedFormationSlots = selectionSlots
    .map((slot, originalIndex) => ({ slot, originalIndex }))
    .sort((a, b) => positionPriority[a.slot.position] - positionPriority[b.slot.position]);

  const isUnusedStarter = (p: CandidatePlayer) => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id);
  const toIdealTeamPlayer = (candidate: CandidatePlayer, assignedPosition: string, isAlternativeSelection = false, isTierException = !meetsTierRequirement(candidate.card, candidate.position)): IdealTeamPlayer => ({
    ...candidate,
    assignedPosition,
    isAlternativeSelection,
    isTierException,
  });

  // Match all slots before considering alternatives. Reassign a shared player
  // when another compatible player can cover their previous slot.
  const starterCandidates = selectionSlots.map(slot => getCandidatesForSlot(slot));
  const assignedStarters: (CandidatePlayer | null)[] = selectionSlots.map(() => null);
  const assignStarter = (index: number, visited: Set<number>): boolean => {
    if (visited.has(index)) return false;
    visited.add(index);
    const findOwner = (candidate: CandidatePlayer) => assignedStarters.findIndex(assigned =>
      assigned?.player.id === candidate.player.id || assigned?.card.id === candidate.card.id
    );
    const candidates = assignedStarters[index] && meetsSlotTierRequirement(assignedStarters[index]!, selectionSlots[index])
      ? starterCandidates[index].filter(candidate => meetsSlotTierRequirement(candidate, selectionSlots[index]))
      : starterCandidates[index];
    const available = candidates.find(candidate => findOwner(candidate) === -1);
    if (available) {
      assignedStarters[index] = available;
      return true;
    }
    for (const candidate of candidates) {
      const owner = findOwner(candidate);
      if (owner !== index && assignStarter(owner, visited)) {
        assignedStarters[index] = candidate;
        return true;
      }
    }
    return false;
  };
  selectionSlots.forEach((_, index) => assignStarter(index, new Set()));
  // Only expand the pool after all possible tier-qualified assignments are made.
  selectionSlots.forEach((slot, index) => {
    starterCandidates[index] = [
      ...starterCandidates[index],
      ...getCandidatesForSlot(slot, false, true).filter(p => !meetsSlotTierRequirement(p, slot)),
    ];
  });
  selectionSlots.forEach((_, index) => {
    if (!assignedStarters[index]) assignStarter(index, new Set());
  });
  assignedStarters.forEach(starter => {
    if (starter) {
      usedPlayerIds.add(starter.player.id);
      usedCardIds.add(starter.card.id);
    }
  });
  const starters: (IdealTeamPlayer | null)[] = selectionSlots.map((slot, index) => {
    const exactStarter = assignedStarters[index];
    const requiresStyles = (slot.offensiveStyles || []).length > 0 || slot.defensiveStyles.length > 0;
    const starter = exactStarter ?? (requiresStyles ? null : (
      getCandidatesForSlot(slot, true).find(isUnusedStarter)
      ?? [...allPlayerCandidates].filter(p => meetsTierRequirement(p.card, p.position)).sort(candidateSort).find(isUnusedStarter)
      ?? getCandidatesForSlot(slot, true, true).find(isUnusedStarter)
      ?? [...allPlayerCandidates].sort(candidateSort).find(isUnusedStarter)
    ));
    if (!starter) return null;
    usedPlayerIds.add(starter.player.id);
    usedCardIds.add(starter.card.id);
    return toIdealTeamPlayer(starter, slot.profileName || slot.position, starter !== exactStarter, !meetsSlotTierRequirement(starter, slot));
  });

  // 2. ASSIGN BENCH — prioritized "player testers": candidates with < 5 matches in the position.
  // When no testers are left, select the best players in that position.
  // Slots 1-11 follow position order and keep empty slots in place.
  // Slot 12 is an extra player (tester or best remaining) appended at the very end.
  const isTester = (p: CandidatePlayer) => p.performance.stats.matches < 5;

  const benchAssignments: (IdealTeamPlayer | null)[] = Array(11).fill(null);
  const usedPlayerIdsForBench = new Set<string>(usedPlayerIds);
  const usedCardIdsForBench = new Set<string>(usedCardIds);

  // Fill qualified backups first; only then fill remaining vacancies with exceptions.
  const assignedBackups: (CandidatePlayer | null)[] = sortedFormationSlots.slice(0, 11).map(() => null);
  for (const allowTierFallback of [false, true]) {
    const backupCandidates = sortedFormationSlots.slice(0, 11).map(({ slot, originalIndex }) => {
      const starterRole = starters[originalIndex]?.role;
      const sameRole = (slot.offensiveStyles || slot.styles || []).length > 0 && starterRole && starterRole !== 'Ninguno'
        ? getCandidatesForSlot({ ...slot, styles: [starterRole], offensiveStyles: [starterRole] }, false, allowTierFallback)
        : [];
      const groups = [sameRole, getCandidatesForSlot(slot, false, allowTierFallback), getCandidatesForSlot(slot, true, allowTierFallback)];
      return [...new Set(groups.flatMap(group => [...group.filter(isTester), ...group.filter(p => !isTester(p))]))]
        .filter(isUnusedStarter);
    });
    const assignBackup = (index: number, visited: Set<number>): boolean => {
      if (visited.has(index)) return false;
      visited.add(index);
      const slot = sortedFormationSlots[index].slot;
      const candidates = assignedBackups[index] && meetsSlotTierRequirement(assignedBackups[index]!, slot)
        ? backupCandidates[index].filter(p => meetsSlotTierRequirement(p, slot))
        : backupCandidates[index];
      const findOwner = (p: CandidatePlayer) => assignedBackups.findIndex(assigned =>
        assigned?.player.id === p.player.id || assigned?.card.id === p.card.id
      );
      const available = candidates.find(p => findOwner(p) === -1);
      if (available) {
        assignedBackups[index] = available;
        return true;
      }
      for (const candidate of candidates) {
        const owner = findOwner(candidate);
        if (owner !== index && assignBackup(owner, visited)) {
          assignedBackups[index] = candidate;
          return true;
        }
      }
      return false;
    };
    assignedBackups.forEach((backup, index) => {
      if (!backup) assignBackup(index, new Set());
    });
  }
  assignedBackups.forEach((backup, index) => {
    if (!backup) return;
    const slot = sortedFormationSlots[index].slot;
    usedPlayerIdsForBench.add(backup.player.id);
    usedCardIdsForBench.add(backup.card.id);
    benchAssignments[index] = toIdealTeamPlayer(backup, slot.profileName || slot.position, !getCandidatesForSlot(slot, false, true).includes(backup), !meetsSlotTierRequirement(backup, slot));
  });

  // Slot 12: extra tester or best remaining — any position, same role criteria as bench slots 1-11
  let extraBenchAssignment: IdealTeamPlayer | null = null;
  for (const allowTierFallback of [false, true]) {
    if (extraBenchAssignment) break;
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
      const slotRequiresStyles = (slot.offensiveStyles || slot.styles || []).length > 0;

      let candidates: CandidatePlayer[];
      if (slotRequiresStyles && starterRole && starterRole !== 'Ninguno') {
        // Same role as the starter (only if formation specifies styles)
        candidates = getCandidatesForSlot({ ...slot, styles: [starterRole], offensiveStyles: [starterRole] }, false, allowTierFallback);
        // Fallback: slot's required styles
        if (candidates.filter(isAvailableForExtra).length === 0) {
          candidates = getCandidatesForSlot(slot, false, allowTierFallback);
        }
      } else {
        candidates = getCandidatesForSlot(slot, false, allowTierFallback);
      }
      if (!candidates.some(isAvailableForExtra)) {
        candidates = getCandidatesForSlot(slot, true, allowTierFallback);
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
      const matchingSlot = selectionSlots.find(slot => getCandidatesForSlot(slot, true, allowTierFallback).includes(extra));
      extraBenchAssignment = toIdealTeamPlayer(extra, extra.position, false, matchingSlot ? !meetsSlotTierRequirement(extra, matchingSlot) : !meetsTierRequirement(extra.card, extra.position));
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
