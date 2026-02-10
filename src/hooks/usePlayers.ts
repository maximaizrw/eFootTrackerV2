
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, AddRatingFormValues, EditCardFormValues, EditPlayerFormValues, PlayerBuild, League, Nationality, PlayerAttributeStats, IdealBuild, PhysicalAttribute, FlatPlayer, PlayerPerformance, PlayerSkill, LiveUpdateRating, IdealBuildType } from '@/lib/types';
import { getAvailableStylesForPosition } from '@/lib/types';
import { normalizeText, normalizeStyleName, calculateProgressionStats, getIdealBuildForPlayer, isSpecialCard, calculateProgressionSuggestions, calculateAffinityWithBreakdown, calculateStats, calculateGeneralScore } from '@/lib/utils';


export function usePlayers(idealBuilds: IdealBuild[] = [], targetIdealType: IdealBuildType = 'Contraataque largo') {
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

            const newCards: PlayerCard[] = (data.cards || []).map((card: any) => {
                return {
                    ...card,
                    id: card.id || uuidv4(),
                    style: normalizeStyleName(card.style),
                    league: card.league || 'Sin Liga',
                    imageUrl: card.imageUrl || '',
                    ratingsByPosition: card.ratingsByPosition || {},
                    buildsByPosition: card.buildsByPosition || {},
                    attributeStats: card.attributeStats || {},
                    physicalAttributes: card.physicalAttributes || {},
                    skills: card.skills || [],
                };
            });

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
                    
                    const currentBuild = card.buildsByPosition?.[ratedPos];
                    
                    const finalStats = specialCard || !currentBuild
                        ? (card.attributeStats || {})
                        : calculateProgressionStats(card.attributeStats || {}, currentBuild, isGoalkeeper);

                    const { bestBuild } = getIdealBuildForPlayer(card.style, ratedPos, idealBuilds, 'Contraataque largo');
                    const affinityBreakdown = calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
                    const affinityScore = affinityBreakdown.totalAffinityScore;
                    
                    const generalScore = calculateGeneralScore(affinityScore, stats.average, stats.matches, performance, player.liveUpdateRating, card.skills, false);

                    return { player, card, ratingsForPos, performance, affinityScore, generalScore, position: ratedPos, affinityBreakdown };
                }).filter((p): p is FlatPlayer => p !== null);
            })
        );
        setFlatPlayers(allFlatPlayers);
    }
  }, [players, idealBuilds]);


  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId } = values;
    if (!db) return;
    
    // Normalize style
    style = normalizeStyleName(style) as any;
    
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
          cardToUpdate.style = normalizeStyleName(values.currentStyle) as any;
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
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
            if (totalProgressionPoints !== undefined && !isSpecialCard(cardToUpdate.name)) cardToUpdate.totalProgressionPoints = totalProgressionPoints;
            
            if (!cardToUpdate.buildsByPosition) cardToUpdate.buildsByPosition = {};
            cardToUpdate.buildsByPosition[position] = { ...build, updatedAt: new Date().toISOString() };

            await updateDoc(playerRef, { cards: newCards });
            toast({ title: "Build Guardada", description: `Build y afinidad para ${position} actualizadas.` });
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
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
          cardToUpdate.physicalAttributes = physical;
          cardToUpdate.skills = skills;
          cardToUpdate.attributeStats = { ...stats };
          
          if(cardToUpdate.buildsByPosition) {
              for (const posKey in cardToUpdate.buildsByPosition) {
                  const pos = posKey as Position;
                  const bld = cardToUpdate.buildsByPosition[pos];
                  if(bld) {
                      const isGK = pos === 'PT';
                      const special = isSpecialCard(cardToUpdate.name);
                      const final = special ? cardToUpdate.attributeStats : calculateProgressionStats(cardToUpdate.attributeStats || {}, bld, isGK);
                      const { bestBuild } = getIdealBuildForPlayer(cardToUpdate.style, pos, idealBuilds, 'Contraataque largo');
                      const newAffinity = calculateAffinityWithBreakdown(final, bestBuild, physical, skills).totalAffinityScore;
                      bld.manualAffinity = newAffinity;
                      bld.updatedAt = new Date().toISOString();
                  }
              }
           }
          await setDoc(playerRef, { ...playerData, cards: newCards });
          toast({ title: "Atributos Guardados", description: `Atributos y afinidades recalculados para Contraataque largo.` });
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
    toast({ title: "Iniciando Recálculo...", description: `Actualizando afinidades para Contraataque largo.` });
    let updatedCount = 0;
    try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        for (const playerDoc of playersSnapshot.docs) {
            const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
            let playerWasUpdated = false;
            const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

            for (const card of newCards) {
                if (card.buildsByPosition) {
                    for (const posKey in card.buildsByPosition) {
                        const pos = posKey as Position;
                        const build = card.buildsByPosition[pos];
                        if (build && card.attributeStats) {
                           const isGK = pos === 'PT';
                           const special = isSpecialCard(card.name);
                           const final = special ? card.attributeStats : calculateProgressionStats(card.attributeStats, build, isGK);
                           const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, 'Contraataque largo');
                           const newAffinity = calculateAffinityWithBreakdown(final, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
                           if (Math.abs(build.manualAffinity - newAffinity) > 0.01) {
                                build.manualAffinity = newAffinity;
                                build.updatedAt = new Date().toISOString();
                                playerWasUpdated = true;
                           }
                        }
                    }
                }
            }
            if (playerWasUpdated) {
                await setDoc(doc(db, 'players', player.id), { ...player, cards: newCards });
                updatedCount++;
            }
        }
        toast({ title: "Recálculo Completado", description: `Se actualizaron ${updatedCount} jugadores.` });
    } catch (recalcError) {
        toast({ variant: "destructive", title: "Error en el Recálculo", description: `Ocurrió un error.` });
    }
  };

  const suggestAllBuilds = async () => {
    if (!db) return;
    toast({ title: "Iniciando Sugerencias Masivas...", description: `Optimizando builds para Contraataque largo.` });
    let updatedPlayers = 0;
    try {
      const playersSnapshot = await getDocs(collection(db, 'players'));
      for (const playerDoc of playersSnapshot.docs) {
        const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
        let playerWasUpdated = false;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

        for (const card of newCards) {
          if (!isSpecialCard(card.name) && card.totalProgressionPoints && card.buildsByPosition) {
            for (const posKey in card.buildsByPosition) {
              const pos = posKey as Position;
              const { bestBuild } = getIdealBuildForPlayer(card.style, pos, idealBuilds, 'Contraataque largo');
              if (bestBuild) {
                const suggested = calculateProgressionSuggestions(card.attributeStats || {}, bestBuild, pos === 'PT', card.totalProgressionPoints);
                const currentBuild = card.buildsByPosition[pos] || {};
                const newBuild: PlayerBuild = { ...currentBuild, ...suggested };
                const newFinal = calculateProgressionStats(card.attributeStats || {}, newBuild, pos === 'PT');
                const newAffinity = calculateAffinityWithBreakdown(newFinal, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
                newBuild.manualAffinity = newAffinity;
                newBuild.updatedAt = new Date().toISOString();
                card.buildsByPosition[pos] = newBuild;
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
      toast({ title: "Proceso Completado", description: `Se optimizaron las builds de ${updatedPlayers} jugadores.` });
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
