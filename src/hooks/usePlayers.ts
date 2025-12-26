

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, AddRatingFormValues, EditCardFormValues, EditPlayerFormValues, PlayerBuild, League, Nationality, PlayerAttributeStats, IdealBuild } from '@/lib/types';
import { getAvailableStylesForPosition } from '@/lib/types';
import { normalizeText, calculateProgressionStats, calculateAutomaticAffinity, getIdealBuildForPlayer, isSpecialCard, calculateProgressionSuggestions } from '@/lib/utils';


export function usePlayers(idealBuilds: IdealBuild[] = []) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      const errorMessage = "La configuración de Firebase no está completa. Revisa que las variables de entorno se hayan añadido correctamente.";
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
                attributeStats: card.attributeStats || {},
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
                } as Player);
            }
        });

        const playersData = Array.from(playerMap.values());
        setPlayers(playersData);
        setError(null);
      } catch (err) {
          console.error("Error processing players snapshot: ", err);
          setError("No se pudieron procesar los datos de los jugadores.");
          toast({
              variant: "destructive",
              title: "Error de Datos",
              description: "No se pudieron procesar los datos de los jugadores.",
          });
      } finally {
        setLoading(false);
      }
    }, (err) => {
        console.error("Error fetching players from Firestore: ", err);
        setError("No se pudo conectar a la base de datos para leer jugadores.");
        setPlayers([]);
        setLoading(false);
        toast({
            variant: "destructive",
            title: "Error de Conexión",
            description: "No se pudo conectar a la base de datos para leer jugadores."
        });
    });

    return () => {
      unsubPlayers();
    };
  }, [toast]);

  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId } = values;

    if (!db) {
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se puede conectar a la base de datos." });
        return;
    }
    
    const validStylesForPosition = getAvailableStylesForPosition(position);
    if (!validStylesForPosition.includes(style)) {
        style = 'Ninguno';
    }


    try {
      if (!playerId) {
        const normalizedPlayerName = normalizeText(playerName);
        const existingPlayer = players.find(p => normalizeText(p.name) === normalizedPlayerName);
        if (existingPlayer) {
          playerId = existingPlayer.id;
        }
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
          if (!card.buildsByPosition[position]) {
            card.buildsByPosition[position] = { manualAffinity: 0 };
          }
          
        } else {
          card = { 
              id: uuidv4(), 
              name: cardName, 
              style: style, 
              league: league || 'Sin Liga',
              imageUrl: '',
              ratingsByPosition: { [position]: [rating] },
              buildsByPosition: { [position]: { manualAffinity: 0 } },
          };
          newCards.push(card);
        }
        await updateDoc(playerRef, { cards: newCards });
      } else {
        const newPlayer = {
          name: playerName,
          nationality: nationality,
          cards: [{ 
              id: uuidv4(), 
              name: cardName, 
              style: style, 
              league: league || 'Sin Liga',
              imageUrl: '',
              ratingsByPosition: { [position]: [rating] },
              buildsByPosition: { [position]: { manualAffinity: 0 } },
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
      });
      toast({ title: "Jugador Actualizado", description: "Los datos del jugador se han actualizado." });
    } catch (error) {
      console.error("Error updating player: ", error);
      toast({ variant: "destructive", title: "Error al Actualizar", description: "No se pudo guardar el cambio de nombre." });
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
          toast({ variant: "destructive", title: "Error", description: "No se encontraron valoraciones para esta posición." });
          return;
      }
      
      delete cardToUpdate.ratingsByPosition[position];

      const hasRatingsLeft = Object.keys(cardToUpdate.ratingsByPosition).length > 0;
      
      const finalCards = hasRatingsLeft ? newCards.map(c => c.id === cardId ? cardToUpdate : c) : newCards.filter(c => c.id !== cardId);

      if (finalCards.length === 0 && playerData.cards.length === 1) {
          await deleteDoc(playerRef);
          toast({ title: "Jugador Eliminado", description: `Se eliminaron las valoraciones y la carta de ${playerData.name}, y como no tenía más cartas, fue eliminado.` });
      } else {
          await updateDoc(playerRef, { cards: finalCards });
          toast({ title: "Acción Completada", description: `Se eliminaron todas las valoraciones de ${playerData.name} para la posición ${position}.` });
      }
    } catch (error) {
        console.error("Error deleting position ratings: ", error);
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
          if (card.ratingsByPosition[position]!.length === 0) {
              delete card.ratingsByPosition[position];
          }
          await updateDoc(playerRef, { cards: newCards });
          toast({ title: "Valoración Eliminada", description: "La valoración ha sido eliminada." });
      }
    } catch (error) {
        console.error("Error deleting rating: ", error);
        toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar la valoración." });
    }
  };
  
  const savePlayerBuild = async (playerId: string, cardId: string, position: Position, build: PlayerBuild, totalProgressionPoints?: number) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) {
            throw new Error("Player document not found!");
        }

        const playerData = playerDoc.data() as Player;
        const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
            if (!cardToUpdate.buildsByPosition) {
              cardToUpdate.buildsByPosition = {};
            }
            if (totalProgressionPoints !== undefined && !isSpecialCard(cardToUpdate.name)) {
              cardToUpdate.totalProgressionPoints = totalProgressionPoints;
            }
            
            const isGoalkeeper = position === 'PT';
            const specialCard = isSpecialCard(cardToUpdate.name);
            const playerFinalStats = specialCard
                ? cardToUpdate.attributeStats || {}
                : calculateProgressionStats(cardToUpdate.attributeStats || {}, build, isGoalkeeper);

            const { bestBuild, bestStyle } = getIdealBuildForPlayer(cardToUpdate.style, position, idealBuilds);
            const affinity = calculateAutomaticAffinity(playerFinalStats, bestBuild);
            
            const updatedBuild: PlayerBuild = {
              ...build,
              manualAffinity: affinity,
              updatedAt: new Date().toISOString(),
            };

            cardToUpdate.buildsByPosition[position] = updatedBuild;
            
            await updateDoc(playerRef, { cards: newCards });
            toast({ title: "Build Guardada", description: `La build del jugador para ${position} se ha actualizado con afinidad ${affinity.toFixed(2)} (estilo ideal: ${bestStyle || 'N/A'}).` });
        } else {
            throw new Error("Card not found in player data!");
        }
    } catch (error) {
        console.error("Error saving player build: ", error);
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la build." });
    }
  };

  const saveAttributeStats = async (playerId: string, cardId: string, stats: PlayerAttributeStats, legLength?: number) => {
     if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) {
            throw new Error("Player document not found!");
        }

        const playerData = playerDoc.data() as Player;
        const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
          if (!cardToUpdate.attributeStats) cardToUpdate.attributeStats = {};
          
          cardToUpdate.legLength = legLength;

          const baseStats: PlayerAttributeStats = {
            ...stats,
            baseOffensiveAwareness: stats.offensiveAwareness, baseBallControl: stats.ballControl, baseDribbling: stats.dribbling,
            baseTightPossession: stats.tightPossession, baseLowPass: stats.lowPass, baseLoftedPass: stats.loftedPass,
            baseFinishing: stats.finishing, baseHeading: stats.heading, basePlaceKicking: stats.placeKicking, baseCurl: stats.curl,
            baseDefensiveAwareness: stats.defensiveAwareness, baseDefensiveEngagement: stats.defensiveEngagement, baseTackling: stats.tackling,
            baseAggression: stats.aggression, baseGoalkeeping: stats.goalkeeping, baseGkCatching: stats.gkCatching,
            baseGkParrying: stats.gkParrying, baseGkReflexes: stats.gkReflexes, baseGkReach: stats.gkReach,
            baseSpeed: stats.speed, baseAcceleration: stats.acceleration, baseKickingPower: stats.kickingPower,
            baseJump: stats.jump, basePhysicalContact: stats.physicalContact, baseBalance: stats.balance, baseStamina: stats.stamina,
          };
          
          cardToUpdate.attributeStats = baseStats;
          
          // Recalculate affinity for all positions on this card
           if(cardToUpdate.buildsByPosition) {
              for (const posKey in cardToUpdate.buildsByPosition) {
                  const position = posKey as Position;
                  const build = cardToUpdate.buildsByPosition[position];
                  if(build) {
                      const isGoalkeeper = position === 'PT';
                      const specialCard = isSpecialCard(cardToUpdate.name);
                      const finalStats = specialCard ? baseStats : calculateProgressionStats(baseStats, build, isGoalkeeper);
                      const { bestBuild } = getIdealBuildForPlayer(cardToUpdate.style, position, idealBuilds);
                      const newAffinity = calculateAutomaticAffinity(finalStats, bestBuild);

                      build.manualAffinity = newAffinity;
                      build.updatedAt = new Date().toISOString();
                  }
              }
           }

          await setDoc(playerRef, { ...playerData, cards: newCards });
          toast({ title: "Atributos Guardados", description: `Los atributos de la carta y las afinidades se han recalculado.` });
        } else {
           throw new Error("Card not found!");
        }

    } catch (error) {
      console.error("Error saving attribute stats: ", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudieron guardar los atributos." });
    }
  };


  const downloadBackup = async () => {
    if (!db) return null;
    try {
      const playersCollection = collection(db, 'players');
      const playerSnapshot = await getDocs(playersCollection);
      return playerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching players for backup: ", error);
      return null;
    }
  };

  const recalculateAllAffinities = async () => {
    if (!db) return;
    toast({ title: "Iniciando Recálculo...", description: "Actualizando todas las afinidades de los jugadores." });
    let updatedCount = 0;
    try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));

        for (const player of allPlayers) {
            let playerWasUpdated = false;
            const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

            for (const card of newCards) {
                if (card.buildsByPosition && Object.keys(card.buildsByPosition).length > 0) {
                    for (const posKey in card.buildsByPosition) {
                        const position = posKey as Position;
                        const build = card.buildsByPosition[position];
                        
                        if (build && card.attributeStats) {
                           const isGoalkeeper = position === 'PT';
                           const specialCard = isSpecialCard(card.name);
                           const finalStats = specialCard ? card.attributeStats : calculateProgressionStats(card.attributeStats, build, isGoalkeeper);
                           const { bestBuild } = getIdealBuildForPlayer(card.style, position, idealBuilds);
                           const newAffinity = calculateAutomaticAffinity(finalStats, bestBuild);

                           if (build.manualAffinity !== newAffinity) {
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
        toast({ title: "Recálculo Completado", description: `Se actualizaron las afinidades de ${updatedCount} jugadores.` });

    } catch (recalcError) {
        console.error("Error recalculating all affinities:", recalcError);
        toast({
            variant: "destructive",
            title: "Error en el Recálculo",
            description: `Ocurrió un error al actualizar las afinidades.`,
        });
    }
  };

  const suggestAllBuilds = async () => {
    if (!db) return;
    toast({ title: "Iniciando Sugerencias Masivas...", description: "Calculando y aplicando builds óptimas." });
    let updatedPlayers = 0;

    try {
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));

      for (const player of allPlayers) {
        let playerWasUpdated = false;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(player.cards || []));

        for (const card of newCards) {
          const isEligible = !isSpecialCard(card.name) && card.totalProgressionPoints && card.totalProgressionPoints > 0;
          
          if (isEligible && card.buildsByPosition && Object.keys(card.buildsByPosition).length > 0) {
            for (const posKey in card.buildsByPosition) {
              const position = posKey as Position;
              const isGoalkeeper = position === 'PT';

              const { bestBuild } = getIdealBuildForPlayer(card.style, position, idealBuilds);
              if (bestBuild) {
                const suggestedProgression = calculateProgressionSuggestions(card.attributeStats || {}, bestBuild, isGoalkeeper, card.totalProgressionPoints);
                const currentBuild = card.buildsByPosition[position] || {};

                // Apply new suggestions
                const newBuild: PlayerBuild = { ...currentBuild, ...suggestedProgression };
                
                // Recalculate affinity with the new build
                const newFinalStats = calculateProgressionStats(card.attributeStats || {}, newBuild, isGoalkeeper);
                const { bestBuild: newBestBuild } = getIdealBuildForPlayer(card.style, position, idealBuilds);
                const newAffinity = calculateAutomaticAffinity(newFinalStats, newBestBuild);
                
                newBuild.manualAffinity = newAffinity;
                newBuild.updatedAt = new Date().toISOString();
                
                card.buildsByPosition[position] = newBuild;
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
      console.error("Error suggesting all builds:", error);
      toast({
        variant: "destructive",
        title: "Error en la Sugerencia Masiva",
        description: "Ocurrió un error al optimizar las builds.",
      });
    }
  };

  return { players, loading, error, addRating, editCard, editPlayer, deleteRating, savePlayerBuild, saveAttributeStats, downloadBackup, deletePositionRatings, recalculateAllAffinities, suggestAllBuilds };
}

    
