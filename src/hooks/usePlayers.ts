
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, AddRatingFormValues, EditCardFormValues, EditPlayerFormValues, PlayerBuild, League, Nationality, PlayerAttributeStats, IdealBuild, PhysicalAttribute, FlatPlayer, PlayerPerformance, PlayerSkill, LiveUpdateRating, IdealBuildType } from '@/lib/types';
import { getAvailableStylesForPosition } from '@/lib/types';
import { normalizeText, calculateProgressionStats, getIdealBuildForPlayer, isSpecialCard, calculateProgressionSuggestions, calculateAffinityWithBreakdown, calculateStats, calculateGeneralScore } from '@/lib/utils';


export function usePlayers(idealBuilds: IdealBuild[] = [], targetIdealType: IdealBuildType = 'General') {
  const [players, setPlayers] = useState<Player[]>([]);
  const [flatPlayers, setFlatPlayers] = useState<FlatPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      const errorMessage = "La configuración de Firebase no está completa.";
      setError(errorMessage);
      setLoading(false);
      return;
    }

    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      try {
        const playerMap = new Map<string, Player>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const playerName = data.name;
            const normalizedName = normalizeText(playerName);

            const newCards: PlayerCard[] = (data.cards || []).map((card: any) => ({
                ...card,
                id: card.id || uuidv4(),
                style: card.style || 'Ninguno',
                league: card.league || 'Sin Liga',
                imageUrl: card.imageUrl || '',
                ratingsByPosition: card.ratingsByPosition || {},
                buildsByPosition: card.buildsByPosition || {},
                buildsByTactic: card.buildsByTactic || {},
                attributeStats: card.attributeStats || {},
                physicalAttributes: card.physicalAttributes || {},
                skills: card.skills || [],
            }));

            if (playerMap.has(normalizedName)) {
                const existingPlayer = playerMap.get(normalizedName)!;
                const existingCards = existingPlayer.cards;
                const cardsToMerge = newCards.filter(newCard => 
                    !existingCards.some(existingCard => existingCard.id === newCard.id || normalizeText(existingCard.name) === normalizeText(newCard.name))
                );
                existingPlayer.cards.push(...cardsToMerge);
            } else {
                playerMap.set(normalizedName, {
                    id: doc.id,
                    name: playerName,
                    nationality: data.nationality || 'Sin Nacionalidad',
                    cards: newCards,
                    liveUpdateRating: data.liveUpdateRating || null,
                    permanentLiveUpdateRating: data.permanentLiveUpdateRating || false,
                } as Player);
            }
        });

        const playersData = Array.from(playerMap.values());
        setPlayers(playersData);
        setError(null);
      } catch (err) {
          console.error("Error processing players snapshot: ", err);
          setError("No se pudieron procesar los datos de los jugadores.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
        console.error("Error fetching players from Firestore: ", err);
        setError("No se pudo conectar a la base de datos.");
        setPlayers([]);
        setLoading(false);
    });

    return () => unsubPlayers();
  }, []);

  useEffect(() => {
    if (players.length > 0 && idealBuilds) {
        const allFlatPlayers = players.flatMap(player => 
            (player.cards || []).flatMap(card => {
                const playerPositions = Object.keys(card.ratingsByPosition || {}) as Position[];
                const averagesByPosition = new Map<Position, number>();
                
                playerPositions.forEach(p => {
                    const ratings = card.ratingsByPosition?.[p];
                    if (ratings && ratings.length > 0) {
                        averagesByPosition.set(p, calculateStats(ratings).average);
                    }
                });

                return playerPositions.map(ratedPos => {
                    const ratingsForPos = card.ratingsByPosition?.[ratedPos] || [];
                    if (ratingsForPos.length === 0) return null;

                    const stats = calculateStats(ratingsForPos);
                    const recentRatings = ratingsForPos.slice(-3);
                    const recentStats = calculateStats(recentRatings);

                    const highPerfPositions = new Set<Position>();
                    for (const [p, avg] of averagesByPosition.entries()) {
                        if (avg >= 7.0) highPerfPositions.add(p);
                    }

                    let isSpecialist = false;
                    const currentAvg = averagesByPosition.get(ratedPos);
                    if (currentAvg && currentAvg >= 8.5 && averagesByPosition.size > 1) {
                        let otherPositionsWeaker = true;
                        for (const [p, avg] of averagesByPosition.entries()) {
                            if (p !== ratedPos && avg >= currentAvg - 1.5) {
                                otherPositionsWeaker = false;
                                break;
                            }
                        }
                        isSpecialist = otherPositionsWeaker;
                    }
                    
                    const performance: PlayerPerformance = {
                        stats,
                        isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
                        isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
                        isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
                        isVersatile: highPerfPositions.size >= 3,
                        isGameChanger: stats.matches >= 5 && stats.stdDev > 1.0 && stats.average >= 7.5,
                        isStalwart: stats.matches >= 100 && stats.average >= 7.0,
                        isSpecialist: isSpecialist,
                    };
                    
                    const isGoalkeeper = ratedPos === 'PT';
                    const specialCard = isSpecialCard(card.name);
                    
                    // Style-aware build selection
                    let currentBuild = card.buildsByTactic?.[targetIdealType]?.[ratedPos];
                    if (!currentBuild && targetIdealType !== 'General') {
                        currentBuild = card.buildsByPosition?.[ratedPos];
                    }
                    
                    const finalStats = specialCard || !currentBuild
                        ? (card.attributeStats || {})
                        : calculateProgressionStats(card.attributeStats || {}, currentBuild, isGoalkeeper);

                    const { bestBuild } = getIdealBuildForPlayer(card.style, ratedPos, idealBuilds, targetIdealType);
                    const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
                    const affinityScore = affinityBreakdown.totalAffinityScore;
                    
                    const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false);

                    return { player, card, ratingsForPos, performance, affinityScore, generalScore, position: ratedPos, affinityBreakdown };
                }).filter((p): p is FlatPlayer => p !== null);
            })
        );
        setFlatPlayers(allFlatPlayers);
    }
  }, [players, idealBuilds, targetIdealType]);


  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId } = values;
    if (!db) return;
    
    const validStylesForPosition = getAvailableStylesForPosition(position, true);
    if (!validStylesForPosition.includes(style)) style = 'Ninguno';

    try {
      if (!playerId) {
        const normalizedPlayerName = normalizeText(playerName);
        const existingPlayer = players.find(p => normalizeText(p.name) === normalizedPlayerName);
        if (existingPlayer) playerId = existingPlayer.id;
      }

      if (playerId) {
        const playerRef = doc(db, 'players', playerId);
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) throw new Error("Player not found");
        
        const playerData = playerDoc.data() as Player;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        let card = newCards.find(c => normalizeText(c.name) === normalizeText(cardName));

        if (card) {
          if (!card.ratingsByPosition) card.ratingsByPosition = {};
          if (!card.ratingsByPosition[position]) card.ratingsByPosition[position] = [];
          card.ratingsByPosition[position]!.push(rating);
          card.league = league || card.league || 'Sin Liga';
          if (!card.buildsByPosition) card.buildsByPosition = {};
          if (!card.buildsByPosition[position]) card.buildsByPosition[position] = { manualAffinity: 0 };
        } else {
          card = { 
              id: uuidv4(), 
              name: cardName, 
              style: style, 
              league: league || 'Sin Liga',
              imageUrl: '',
              ratingsByPosition: { [position]: [rating] },
              buildsByPosition: { [position]: { manualAffinity: 0 } },
              buildsByTactic: { General: { [position]: { manualAffinity: 0 } } },
              attributeStats: {},
              physicalAttributes: {},
              skills: [],
          };
          newCards.push(card);
        }
        await updateDoc(playerRef, { cards: newCards });
      } else {
        const newPlayer: Omit<Player, 'id'> = {
          name: playerName,
          nationality: nationality,
          liveUpdateRating: null,
          cards: [{ 
              id: uuidv4(), 
              name: cardName, 
              style: style, 
              league: league || 'Sin Liga',
              imageUrl: '',
              ratingsByPosition: { [position]: [rating] },
              buildsByPosition: { [position]: { manualAffinity: 0 } },
              buildsByTactic: { General: { [position]: { manualAffinity: 0 } } },
              attributeStats: {},
              physicalAttributes: {},
              skills: [],
          }],
        };
        await addDoc(collection(db, 'players'), newPlayer);
      }
      toast({ title: "Éxito", description: `La valoración para ${playerName} ha sido guardada.` });
    } catch (error) {
      console.error("Error adding rating: ", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la valoración." });
    }
  };

  const editCard = async (values: EditCardFormValues) => {
    if (!db) return;
    const playerRef = doc(db, 'players', values.playerId);
    try {
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) throw new Error("Player not found");
      
      const playerData = playerDoc.data() as Player;
      const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
      const cardToUpdate = newCards.find(c => c.id === values.cardId);

      if (cardToUpdate) {
          cardToUpdate.name = values.currentCardName;
          cardToUpdate.style = values.currentStyle;
          cardToUpdate.league = values.league || 'Sin Liga';
          cardToUpdate.imageUrl = values.imageUrl || '';
          await updateDoc(playerRef, { cards: newCards });
          toast({ title: "Carta Actualizada", description: "Los datos de la carta se han actualizado." });
      }
    } catch (error) {
      console.error("Error updating card: ", error);
      toast({ variant: "destructive", title: "Error al Actualizar", description: "No se pudieron guardar los cambios." });
    }
  };

  const editPlayer = async (values: EditPlayerFormValues) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'players', values.playerId), { 
        name: values.currentPlayerName,
        nationality: values.nationality,
        permanentLiveUpdateRating: values.permanentLiveUpdateRating || false,
      });
      toast({ title: "Jugador Actualizado", description: "Los datos del jugador se han actualizado." });
    } catch (error) {
      console.error("Error updating player: ", error);
      toast({ variant: "destructive", title: "Error al Actualizar", description: "No se pudo guardar el cambio." });
    }
  };

  const deletePositionRatings = async (playerId: string, cardId: string, position: Position) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) throw new Error("Player not found");
      
      const playerData = playerDoc.data() as Player;
      const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards));
      const cardToUpdate = newCards.find(c => c.id === cardId);

      if (!cardToUpdate?.ratingsByPosition?.[position]) {
          toast({ variant: "destructive", title: "Error", description: "No se encontraron valoraciones." });
          return;
      }
      
      delete cardToUpdate.ratingsByPosition[position];
      const hasRatingsLeft = Object.keys(cardToUpdate.ratingsByPosition).length > 0;
      const finalCards = hasRatingsLeft ? newCards.map(c => c.id === cardId ? cardToUpdate : c) : newCards.filter(c => c.id !== cardId);

      if (finalCards.length === 0 && playerData.cards.length === 1) {
          await deleteDoc(playerRef);
      } else {
          await updateDoc(playerRef, { cards: finalCards });
      }
      toast({ title: "Acción Completada", description: `Se eliminaron las valoraciones de ${position}.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo completar la acción." });
    }
  };

  const deleteRating = async (playerId: string, cardId: string, position: Position, ratingIndex: number) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) throw new Error("Player not found");
      
      const playerData = playerDoc.data() as Player;
      const newCards = JSON.parse(JSON.stringify(playerData.cards)) as PlayerCard[];
      const card = newCards.find(c => c.id === cardId);
      
      if(card?.ratingsByPosition?.[position]) {
          card.ratingsByPosition[position]!.splice(ratingIndex, 1);
          if (card.ratingsByPosition[position]!.length === 0) delete card.ratingsByPosition[position];
          await updateDoc(playerRef, { cards: newCards });
          toast({ title: "Valoración Eliminada", description: "La valoración ha sido eliminada." });
      }
    } catch (error) {
        toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar la valoración." });
    }
  };
  
  const savePlayerBuild = async (playerId: string, cardId: string, position: Position, build: PlayerBuild, totalProgressionPoints?: number) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) throw new Error("Player not found");

        const playerData = playerDoc.data() as Player;
        const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
            if (!cardToUpdate.buildsByTactic) cardToUpdate.buildsByTactic = {};
            if (!cardToUpdate.buildsByTactic[targetIdealType]) cardToUpdate.buildsByTactic[targetIdealType] = {};
            
            if (totalProgressionPoints !== undefined && !isSpecialCard(cardToUpdate.name)) cardToUpdate.totalProgressionPoints = totalProgressionPoints;
            
            const isGoalkeeper = position === 'PT';
            const specialCard = isSpecialCard(cardToUpdate.name);
            const playerFinalStats = specialCard ? cardToUpdate.attributeStats || {} : calculateProgressionStats(cardToUpdate.attributeStats || {}, build, isGoalkeeper);

            const { bestBuild } = getIdealBuildForPlayer(cardToUpdate.style, position, idealBuilds, targetIdealType);
            const affinity = calculateAffinityWithBreakdown(playerFinalStats, bestBuild, cardToUpdate.physicalAttributes, cardToUpdate.skills).totalAffinityScore;
            
            const updatedBuild: PlayerBuild = { ...build, manualAffinity: affinity, updatedAt: new Date().toISOString() };
            
            // Save to current tactic
            cardToUpdate.buildsByTactic[targetIdealType]![position] = updatedBuild;
            
            // Backwards compatibility for General
            if (targetIdealType === 'General') {
                if (!cardToUpdate.buildsByPosition) cardToUpdate.buildsByPosition = {};
                cardToUpdate.buildsByPosition[position] = updatedBuild;
            }

            await updateDoc(playerRef, { cards: newCards });
            toast({ title: "Build Guardada", description: `Build para ${position} en [${targetIdealType}] actualizada.` });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la build." });
    }
  };

  const saveAttributeStats = async (playerId: string, cardId: string, stats: PlayerAttributeStats, physical: PhysicalAttribute, skills: PlayerSkill[]) => {
     if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) throw new Error("Player not found");

        const playerData = playerDoc.data() as Player;
        const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
          cardToUpdate.physicalAttributes = physical;
          cardToUpdate.skills = skills;
          cardToUpdate.attributeStats = { ...stats };
          
          // Recalculate all affinities for this card across all tactics
          if (cardToUpdate.buildsByTactic) {
              for (const tacticKey in cardToUpdate.buildsByTactic) {
                  const tactic = tacticKey as IdealBuildType;
                  const tacticBuilds = cardToUpdate.buildsByTactic[tactic];
                  if (tacticBuilds) {
                      for (const posKey in tacticBuilds) {
                          const pos = posKey as Position;
                          const bld = tacticBuilds[pos];
                          if (bld) {
                              const isGK = pos === 'PT';
                              const special = isSpecialCard(cardToUpdate.name);
                              const final = special ? cardToUpdate.attributeStats : calculateProgressionStats(cardToUpdate.attributeStats || {}, bld, isGK);
                              const { bestBuild } = getIdealBuildForPlayer(cardToUpdate.style, pos, idealBuilds, tactic);
                              const newAffinity = calculateAffinityWithBreakdown(final, bestBuild, physical, skills).totalAffinityScore;
                              bld.manualAffinity = newAffinity;
                              bld.updatedAt = new Date().toISOString();
                          }
                      }
                  }
              }
          }
          
          // Legacy check
          if(cardToUpdate.buildsByPosition) {
              for (const posKey in cardToUpdate.buildsByPosition) {
                  const pos = posKey as Position;
                  const bld = cardToUpdate.buildsByPosition[pos];
                  if(bld) {
                      const isGK = pos === 'PT';
                      const special = isSpecialCard(cardToUpdate.name);
                      const final = special ? cardToUpdate.attributeStats : calculateProgressionStats(cardToUpdate.attributeStats || {}, bld, isGK);
                      const { bestBuild } = getIdealBuildForPlayer(cardToUpdate.style, pos, idealBuilds, 'General');
                      const newAffinity = calculateAffinityWithBreakdown(final, bestBuild, physical, skills).totalAffinityScore;
                      bld.manualAffinity = newAffinity;
                      bld.updatedAt = new Date().toISOString();
                  }
              }
           }
          await setDoc(playerRef, { ...playerData, cards: newCards });
          toast({ title: "Atributos Guardados", description: `Atributos y afinidades recalculados.` });
        }
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudieron guardar los atributos." });
    }
  };


  const downloadBackup = async () => {
    if (!db) return null;
    try {
      const playersCollection = collection(db, 'players');
      const playerSnapshot = await getDocs(playersCollection);
      return playerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      return null;
    }
  };

  const recalculateAllAffinities = async () => {
    if (!db) return;
    toast({ title: "Iniciando Recálculo...", description: `Actualizando afinidades para la táctica [${targetIdealType}].` });
    let updatedCount = 0;
    try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        for (const playerDoc of playersSnapshot.docs) {
            const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
            let playerWasUpdated = false;
            const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

            for (const card of newCards) {
                // Focus on the selected tactic
                if (!card.buildsByTactic) card.buildsByTactic = {};
                if (!card.buildsByTactic[targetIdealType]) card.buildsByTactic[targetIdealType] = {};
                
                const tacticBuilds = card.buildsByTactic[targetIdealType]!;
                
                // If the tactic is empty, try to seed it from General
                if (Object.keys(tacticBuilds).length === 0 && targetIdealType !== 'General' && card.buildsByPosition) {
                    card.buildsByTactic[targetIdealType] = JSON.parse(JSON.stringify(card.buildsByPosition));
                }

                for (const posKey in card.buildsByTactic[targetIdealType]) {
                    const pos = posKey as Position;
                    const build = card.buildsByTactic[targetIdealType]![pos];
                    if (build && card.attributeStats) {
                       const isGK = pos === 'PT';
                       const special = isSpecialCard(card.name);
                       const final = special ? card.attributeStats : calculateProgressionStats(card.attributeStats, build, isGK);
                       const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType);
                       const newAffinity = calculateAffinityWithBreakdown(final, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
                       if (Math.abs(build.manualAffinity - newAffinity) > 0.01) {
                            build.manualAffinity = newAffinity;
                            build.updatedAt = new Date().toISOString();
                            playerWasUpdated = true;
                       }
                    }
                }
            }
            if (playerWasUpdated) {
                await setDoc(doc(db, 'players', player.id), { ...player, cards: newCards });
                updatedCount++;
            }
        }
        toast({ title: "Recálculo Completado", description: `Se actualizaron ${updatedCount} jugadores para [${targetIdealType}].` });
    } catch (recalcError) {
        toast({ variant: "destructive", title: "Error en el Recálculo", description: `Ocurrió un error.` });
    }
  };

  const suggestAllBuilds = async () => {
    if (!db) return;
    toast({ title: "Iniciando Sugerencias Masivas...", description: `Optimizando builds para la táctica [${targetIdealType}].` });
    let updatedPlayers = 0;
    try {
      const playersSnapshot = await getDocs(collection(db, 'players'));
      for (const playerDoc of playersSnapshot.docs) {
        const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
        let playerWasUpdated = false;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

        for (const card of newCards) {
          if (!isSpecialCard(card.name) && card.totalProgressionPoints) {
            // Ensure buildsByTactic exists
            if (!card.buildsByTactic) card.buildsByTactic = {};
            if (!card.buildsByTactic[targetIdealType]) {
                // If no builds exist for this tactic, we'll initialize them from current ratings
                const ratedPositions = Object.keys(card.ratingsByPosition || {}) as Position[];
                card.buildsByTactic[targetIdealType] = {};
                ratedPositions.forEach(p => card.buildsByTactic![targetIdealType]![p] = { manualAffinity: 0 });
            }

            for (const posKey in card.buildsByTactic[targetIdealType]) {
              const pos = posKey as Position;
              const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, targetIdealType);
              if (bestBuild) {
                const suggested = calculateProgressionSuggestions(card.attributeStats || {}, bestBuild, pos === 'PT', card.totalProgressionPoints);
                const currentBuild = card.buildsByTactic[targetIdealType]![pos] || {};
                const newBuild: PlayerBuild = { ...currentBuild, ...suggested };
                const newFinal = calculateProgressionStats(card.attributeStats || {}, newBuild, pos === 'PT');
                const newAffinity = calculateAffinityWithBreakdown(newFinal, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
                newBuild.manualAffinity = newAffinity;
                newBuild.updatedAt = new Date().toISOString();
                card.buildsByTactic[targetIdealType]![pos] = newBuild;
                
                if (targetIdealType === 'General') {
                    if (!card.buildsByPosition) card.buildsByPosition = {};
                    card.buildsByPosition[pos] = newBuild;
                }
                
                playerWasUpdated = true;
              }
            }
          }
        }
        if (playerWasUpdated) {
          await setDoc(doc(db, 'players', player.id), { ...player, cards: newCards });
          updatedPlayers++;
        }
      }
      toast({ title: "Proceso Completado", description: `Se optimizaron las builds de ${updatedPlayers} jugadores para [${targetIdealType}].` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error en la Sugerencia Masiva", description: "Ocurrió un error." });
    }
  };

  const updateLiveUpdateRating = async (playerId: string, rating: LiveUpdateRating | null) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'players', playerId), { liveUpdateRating: rating });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Actualizar", description: `No se pudo actualizar la letra.` });
    }
  };

  const resetAllLiveUpdateRatings = async () => {
    if (!db) return;
    toast({ title: "Iniciando Reseteo...", description: "Reiniciando las letras." });
    try {
      const playersSnapshot = await getDocs(collection(db, 'players'));
      for (const playerDoc of playersSnapshot.docs) {
        const playerData = playerDoc.data();
        if (!playerData.permanentLiveUpdateRating) {
            await updateDoc(doc(db, 'players', playerDoc.id), { liveUpdateRating: null });
        }
      }
      toast({ title: "Reseteo Completado", description: "Se han reiniciado las letras." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error en el Reseteo", description: `Ocurrió un error.` });
    }
  };

  return { players, flatPlayers, loading, error, addRating, editCard, editPlayer, deleteRating, savePlayerBuild, saveAttributeStats, downloadBackup, deletePositionRatings, recalculateAllAffinities, suggestAllBuilds, updateLiveUpdateRating, resetAllLiveUpdateRatings };
}
