
import type { Player, FormationStats, IdealTeamPlayer, Position, IdealTeamSlot, PlayerCard, PlayerPerformance, League, Nationality, FormationSlot as FormationSlotType, IdealBuild, IdealBuildType } from './types';
import { getAvailableStylesForPosition } from './types';
import { calculateStats, calculateGeneralScore, getIdealBuildForPlayer, calculateProgressionStats, isSpecialCard, calculateAffinityWithBreakdown } from './utils';

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
  sortBy: 'average' | 'general' = 'average',
  isFlexibleLaterals: boolean = false,
  isFlexibleWingers: boolean = false,
  targetIdealType: IdealBuildType = 'Contraataque largo'
): IdealTeamSlot[] {
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
        const recentRatings = ratings.slice(-3);
        const recentStats = calculateStats(recentRatings);
        
        const performance: PlayerPerformance = {
            stats,
            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
            isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
            isVersatile: averagesByPosition.size >= 3,
            isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
            isStalwart: stats.matches >= 100 && stats.average >= 7.0,
        };
        
        const buildsMap = sortBy === 'average' ? (card.averageBuildsByPosition || card.buildsByPosition) : card.buildsByPosition;
        const buildForPos = buildsMap?.[pos];
        const specialCard = isSpecialCard(card.name);
        const finalStats = specialCard || !buildForPos ? (card.attributeStats || {}) : calculateProgressionStats(card.attributeStats || {}, buildForPos, pos === 'PT');
        const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType, card.physicalAttributes?.height);
        const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
        const affinityScore = affinityBreakdown.totalAffinityScore;
        
        const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false);
        const substituteScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, true);

        return { player, card, position: pos, average: stats.average, affinityScore, generalScore, substituteScore, performance };
      }).filter((p): p is CandidatePlayer => p !== null);
    })
  });

  const usedPlayerIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const finalTeamSlots: IdealTeamSlot[] = [];
  
  const sortFunction = (a: CandidatePlayer, b: CandidatePlayer, useSubScore: boolean = false) => {
    if (sortBy === 'average') {
      if (Math.abs(a.average - b.average) > 0.01) return b.average - a.average;
      const scoreA = useSubScore ? a.substituteScore : a.generalScore;
      const scoreB = useSubScore ? b.substituteScore : b.generalScore;
      return scoreB - scoreA;
    } else {
      const scoreA = useSubScore ? a.substituteScore : a.generalScore;
      const scoreB = useSubScore ? b.substituteScore : b.generalScore;
      if (Math.abs(scoreA - scoreB) > 0.01) return scoreB - scoreA;
      return b.affinityScore - a.affinityScore;
    }
  };

  const findBestPlayer = (candidates: CandidatePlayer[], options: { minAffinity: number, relaxRatings: boolean }): CandidatePlayer | undefined => {
      return candidates.find(p => {
        if (usedPlayerIds.has(p.player.id) || usedCardIds.has(p.card.id) || discardedCardIds.has(p.card.id)) return false;
        
        // RESTRICCION ESTRICTA: Mínimo 80 de afinidad para ser considerado "apto" en los niveles normales
        if (options.minAffinity > 0 && p.affinityScore < options.minAffinity) return false;
        
        if (!options.relaxRatings) {
            if (sortBy === 'average' && (p.player.liveUpdateRating !== 'A' && p.player.liveUpdateRating !== 'B')) return false;
            if (sortBy !== 'average' && (p.player.liveUpdateRating === 'D' || p.player.liveUpdateRating === 'E')) return false;
        }
        
        return true;
      });
  };
  
  const getCandidatesForSlot = (formationSlot: FormationSlotType, applyFlex: boolean, ignoreStyle: boolean, isSub: boolean): CandidatePlayer[] => {
    const slotStyles = formationSlot.styles || [];
    const targetPosition = formationSlot.position;
    let targetPositions: Position[] = [targetPosition];
    
    if (applyFlex) {
      if (isFlexibleLaterals && (targetPosition === 'LI' || targetPosition === 'LD')) targetPositions = ['LI', 'LD'];
      if (isFlexibleWingers && (targetPosition === 'EXI' || targetPosition === 'EXD')) targetPositions = ['EXI', 'EXD'];
    }
    
    let filtered = allPlayerCandidates.filter(p => targetPositions.includes(p.position));
    
    if (!ignoreStyle && slotStyles.length > 0) {
        if (slotStyles.length === 1 && slotStyles[0] === 'Ninguno') {
            const activeStyles = getAvailableStylesForPosition(targetPosition);
            filtered = filtered.filter(p => !activeStyles.includes(p.card.style));
        } else {
            filtered = filtered.filter(p => slotStyles.includes(p.card.style));
        }
    }
    
    return filtered.sort((a, b) => sortFunction(a, b, isSub));
  }

  // TITULARES: 4 Niveles de búsqueda para evitar vacantes
  for (const formationSlot of formation.slots) {
    // 1. Óptimo: Estilo + Afinidad 80 + Letra OK
    let cand = getCandidatesForSlot(formationSlot, true, false, false);
    let starter = findBestPlayer(cand, { minAffinity: 80, relaxRatings: false });
    
    // 2. Variante: Cualquier Estilo + Afinidad 80 + Letra OK
    if (!starter) {
        cand = getCandidatesForSlot(formationSlot, true, true, false);
        starter = findBestPlayer(cand, { minAffinity: 80, relaxRatings: false });
    }
    
    // 3. Físico: Cualquier Estilo + Ignorar Afinidad (pero mantener Letra OK si es posible)
    if (!starter) {
        starter = findBestPlayer(cand, { minAffinity: 0, relaxRatings: false });
    }
    
    // 4. OBLIGATORIO: Ignorar todo (Letra y Afinidad) para no dejar vacante
    if (!starter) {
        starter = findBestPlayer(cand, { minAffinity: 0, relaxRatings: true });
    }

    if (starter) {
        usedPlayerIds.add(starter.player.id);
        usedCardIds.add(starter.card.id);
    }
    
    finalTeamSlots.push({ 
        starter: starter ? { ...starter, assignedPosition: formationSlot.position } : null, 
        substitute: null 
    });
  }
  
  // SUPLENTES: También con protocolo de emergencia
  finalTeamSlots.forEach((slot, index) => {
    if (index >= formation.slots.length) return;
    const originalSlot = formation.slots[index];
    const subPos = (slot.starter && slot.starter.position !== originalSlot.position) ? slot.starter.position : originalSlot.position;
    
    const getSub = () => {
        const cand = getCandidatesForSlot({ ...originalSlot, position: subPos }, false, true, true);
        
        // Priorizar jugadores con menos de 10 partidos para probarlos
        const t1 = cand.filter(p => p.performance.stats.matches < 10);
        let found = findBestPlayer(t1, { minAffinity: 80, relaxRatings: false });
        if (found) return found;
        
        // Nivel estándar suplente
        found = findBestPlayer(cand, { minAffinity: 80, relaxRatings: false });
        if (found) return found;
        
        // Nivel emergencia suplente
        return findBestPlayer(cand, { minAffinity: 0, relaxRatings: true });
    };
    
    let sub = getSub();
    if (sub) {
      usedPlayerIds.add(sub.player.id);
      usedCardIds.add(sub.card.id);
      slot.substitute = { ...sub, assignedPosition: originalSlot.position };
    }
  });

  // Banquillo extra si hay espacio
  const remaining = allPlayerCandidates.filter(p => !usedPlayerIds.has(p.player.id) && !usedCardIds.has(p.card.id) && !discardedCardIds.has(p.card.id))
    .sort((a, b) => sortFunction(a, b, true));
    
  let extraSub = findBestPlayer(remaining, { minAffinity: 80, relaxRatings: false }) || findBestPlayer(remaining, { minAffinity: 0, relaxRatings: true });
  
  if (extraSub) {
      finalTeamSlots.push({ 
          starter: null, 
          substitute: { ...extraSub, assignedPosition: extraSub.position } 
      });
  }

  // Rellenar con Placeholders SOLO si no hay ningún jugador en la DB para esa posición
  return finalTeamSlots.map((slot, i) => {
    const formationSlot = i < formation.slots.length ? formation.slots[i] : null;
    const assigned = formationSlot?.position || 'DFC';
    const phPerf = { stats: { average: 0, matches: 0, stdDev: 0 }, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: false };
    const ph = (id: string) => ({ 
        player: { id, name: 'Vacante', cards: [], nationality: 'Sin Nacionalidad' as Nationality }, 
        card: { id: `card-${id}`, name: 'N/A', style: 'Ninguno' as any, ratingsByPosition: {} }, 
        position: assigned, assignedPosition: assigned, average: 0, affinityScore: 0, generalScore: 0, performance: phPerf 
    } as IdealTeamPlayer);
    
    return { 
        starter: slot.starter || (i < 11 ? ph(`ph-s-${i}`) : null), 
        substitute: slot.substitute || (i < 12 ? ph(`ph-sub-${i}`) : null) 
    };
  });
}
