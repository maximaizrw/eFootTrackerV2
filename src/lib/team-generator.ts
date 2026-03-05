import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, IdealBuild, IdealBuildType } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateGeneralScore, calculateRecencyWeightedAverage, getIdealBuildForPlayer, calculateProgressionStats, isSpecialCard, calculateAffinityWithBreakdown } from './utils';

type CandidatePlayer = {
  player: Player;
  card: PlayerCard;
  average: number;
  affinityScore: number;
  generalScore: number;
  substituteScore: number;
  position: Position;
  performance: PlayerPerformance;
};

export function generateIdealTeam(
  players: Player[],
  formation: FormationStats,
  idealBuilds: IdealBuild[],
  discardedCardIds: Set<string> = new Set(),
  league: League | 'all' = 'all',
  nationality: Nationality | 'all' = 'all',
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false,
  targetIdealType: IdealBuildType = 'Contraataque largo',
  selectionCriteria: 'general' | 'average' = 'general',
  prioritizeRecentForm: boolean = false
): IdealTeamSlot[] {
  const requiredPositions = new Set(formation.slots.map(s => s.position));
  if (isFlexibleLaterals) {
      if (requiredPositions.has('LI') || requiredPositions.has('LD')) { requiredPositions.add('LI'); requiredPositions.add('LD'); }
  }
  if (isFlexibleWingers) {
      if (requiredPositions.has('EXI') || requiredPositions.has('EXD')) { requiredPositions.add('EXI'); requiredPositions.add('EXD'); }
  }

  const allPlayerCandidates: CandidatePlayer[] = players.flatMap(player => {
    if (nationality !== 'all' && player.nationality !== nationality) return [];
    
    return (player.cards || []).flatMap(card => {
      if (league !== 'all' && card.league !== league) return [];
      
      const averagesByPosition = new Map<Position, number>();
      for (const p in card.ratingsByPosition) {
          const posKey = p as Position;
          const posRatings = card.ratingsByPosition[posKey];
          if (posRatings && posRatings.length > 0) averagesByPosition.set(posKey, calculateStats(posRatings).average);
      }
      
      const positionsWithRatings = Object.keys(card.ratingsByPosition || {}) as Position[];

      return positionsWithRatings.map(pos => {
        const ratings = card.ratingsByPosition?.[pos];
        if (!ratings || ratings.length === 0) return null;

        const stats = calculateStats(ratings);
        const recentAverage = calculateRecencyWeightedAverage(ratings, 5, 2.5, 0.9);
        
        const buildForPos = card.buildsByPosition?.[pos];
        const specialCard = isSpecialCard(card.name);
        const finalStats = specialCard || !buildForPos ? (card.attributeStats || {}) : calculateProgressionStats(card.attributeStats || {}, buildForPos, pos === 'PT');
        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType, card.physicalAttributes?.height, buildForPos?.forcedBuildId);
        const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
        const affinityScore = affinityBreakdown.totalAffinityScore;

        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && (calculateStats(ratings.slice(-5)).average > stats.average + 0.5),
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: averagesByPosition.size >= 3,
            isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
            isStalwart: stats.matches >= 100 && stats.average >= 7.0,
            isSpecialist: !!bestBuild && bestBuild.profileName !== 'General' && affinityScore >= 92,
        };
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false, recentAverage, prioritizeRecentForm);
        const substituteScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, true, recentAverage, prioritizeRecentForm);

        return { player, card, position: pos, average: stats.average, affinityScore, generalScore, substituteScore, performance };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const starterSort = (a: CandidatePlayer, b: CandidatePlayer) => {
    if (selectionCriteria === 'average') {
        if (Math.abs(b.average - a.average) > 0.01) return b.average - a.average;
        return b.affinityScore - a.affinityScore;
    }
    // High-resolution comparison for general score
    if (Math.abs(b.generalScore - a.generalScore) > 0.001) return b.generalScore - a.generalScore;
    if (Math.abs(b.affinityScore - a.affinityScore) > 0.01) return b.affinityScore - a.affinityScore;
    return b.performance.stats.matches - a.performance.stats.matches;
  };

  const getCandidatesForSlot = (formationSlot: FormationSlotType, applyFlex: boolean): CandidatePlayer[] => {
    const targetPosition = formationSlot.position;
    let targetPositions: Position[] = [targetPosition];
    if (applyFlex) {
      if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
      if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    }
    
    let filtered = allPlayerCandidates.filter(p => targetPositions.includes(p.position));
    
    if (formationSlot.minHeight) filtered = filtered.filter(p => (p.card.physicalAttributes?.height || 0) >= formationSlot.minHeight!);
    if (formationSlot.secondaryPosition) filtered = filtered.filter(p => p.card.ratingsByPosition && p.card.ratingsByPosition[formationSlot.secondaryPosition!]);

    return filtered.map(p => {
        let score = p.generalScore;
        // Bonus if style matches formation slot requirement
        if (formationSlot.styles && formationSlot.styles.length > 0) {
            const matchesStyle = formationSlot.styles.includes(p.card.style);
            if (matchesStyle) score += 2; // Small nudge for tactical fit
        }
        // Bonus if profile matches
        if (formationSlot.profileName && formationSlot.profileName !== 'General') {
            const buildInPos = p.card.buildsByPosition?.[p.position];
            const { bestBuild } = getIdealBuildForPlayer(p.card.style, p.position, idealBuilds, targetIdealType, p.card.physicalAttributes?.height, buildInPos?.forcedBuildId);
            if (bestBuild?.profileName === formationSlot.profileName) score += 3; // Nudge for specific profile
        }
        return { ...p, generalScore: score };
    }).sort(starterSort);
  };

  const passesLiveUpdateFilter = (candidate: CandidatePlayer, relax: boolean) => {
    const r = candidate.player.liveUpdateRating;
    if (!r || r === 'A' || r === 'B' || r === 'C') return true;
    return relax;
  };

  // --- 1. SELECCIÓN DE TITULARES (Prioridad absoluta al Puntaje General) ---
  for (const slot of formation.slots) {
    let cand = getCandidatesForSlot(slot, true);
    
    // Pass 1: Best candidates with acceptable Live Update
    let starter = cand.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id) && passesLiveUpdateFilter(p, false));
    
    // Pass 2: Relax Live Update if no starter found
    if (!starter) starter = cand.find(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id));

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    finalTeamSlots.push({ starter: starter ? { ...starter, assignedPosition: slot.position } : null, substitute: null });
  }
  
  // --- 2. SELECCIÓN DE SUPLENTES ---
  const eligibleSubsList = allPlayerCandidates
    .filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id))
    .filter(p => requiredPositions.has(p.position))
    .filter(p => p.affinityScore >= 80 && (p.performance.stats.matches < 5 || p.performance.stats.average > 6.0))
    .sort((a, b) => a.performance.stats.matches - b.performance.stats.matches || b.substituteScore - a.substituteScore);

  let subIndex = 0;
  for (let i = 0; i < 12; i++) {
      const candidate = eligibleSubsList[subIndex];
      if (candidate) {
          usedPlayerIds.add(candidate.player.id);
          usedCardIds.add(candidate.card.id);
          if (i < finalTeamSlots.length) {
              finalTeamSlots[i].substitute = { ...candidate, assignedPosition: candidate.position };
          } else {
              finalTeamSlots.push({ starter: null, substitute: { ...candidate, assignedPosition: candidate.position } });
          }
          subIndex++;
      }
  }

  const phPerf = { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false };
  const ph = (id: string, pos: Position) => ({ 
      player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' as Nationality }, 
      card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
      position: pos, assignedPosition: pos, average: 0, affinityScore: 0, generalScore: 0, performance: phPerf 
  } as IdealTeamPlayer);

  return finalTeamSlots.slice(0, 12).map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`, assigned) : null), 
        substitute: slot.substitute || ph(`ph-sub-${i}`, assigned) 
    };
  });
}