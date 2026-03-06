'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, AddRatingFormValues, EditCardFormValues, EditPlayerFormValues, PlayerBuild, FlatPlayer, PlayerPerformance, PlayerSkill, LiveUpdateRating, Tier } from '@/lib/types';
import { getAvailableStylesForPosition, playerSkillsList } from '@/lib/types';
import { normalizeText, normalizeStyleName, calculateStats, calculateFinalScore, calculateRecencyWeightedAverage } from '@/lib/utils';


export function usePlayers(prioritizeRecentForm: boolean = false) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [flatPlayers, setFlatPlayers] = useState<FlatPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validSkillsSet = useMemo(() => new Set(playerSkillsList), []);

  useEffect(() => {
    if (!db) {
      setError("La configuración de Firebase no está completa.");
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
                const filteredSkills = (card.skills || []).filter((s: string) => validSkillsSet.has(s as any));

                return {
                    ...card,
                    id: card.id || uuidv4(),
                    style: normalizeStyleName(card.style),
                    league: card.league || 'Sin Liga',
                    imageUrl: card.imageUrl || '',
                    ratingsByPosition: card.ratingsByPosition || {},
                    manualTiersByPosition: card.manualTiersByPosition || {},
                    buildsByPosition: card.buildsByPosition || {},
                    attributeStats: card.attributeStats || {},
                    physicalAttributes: card.physicalAttributes || {},
                    skills: filteredSkills,
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

        setPlayers(Array.from(playerMap.values()));
        setError(null);
      } catch (err) {
          setError("No se pudieron procesar los datos de los jugadores.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
        setError("No se pudo conectar a la base de datos.");
        setPlayers([]);
        setLoading(false);
    });

    return () => unsubPlayers();
  }, [validSkillsSet]);

  useEffect(() => {
    if (players.length > 0) {
        const allFlatPlayers = players.flatMap(player => 
            (player.cards || []).flatMap(card => {
                const playerPositions = Object.keys(card.ratingsByPosition || {}) as Position[];
                
                return playerPositions.map(ratedPos => {
                    const ratingsForPos = card.ratingsByPosition?.[ratedPos] || [];
                    if (ratingsForPos.length === 0) return null;

                    const stats = calculateStats(ratingsForPos);
                    const recentRatings = ratingsForPos.slice(-5);
                    const recentStats = calculateStats(recentRatings);
                    const recentAverage = calculateRecencyWeightedAverage(ratingsForPos, 5, 2.5, 0.9);

                    const performance: PlayerPerformance = {
                        stats,
                        isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
                        isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
                        isPromising: stats.matches > 0 && stats.matches < 5 && stats.average >= 7.0,
                        isVersatile: playerPositions.length >= 3,
                    };
                    
                    const manualTier: Tier = card.manualTiersByPosition?.[ratedPos] || 'D';
                    const finalScore = calculateFinalScore(manualTier, stats.average, stats.matches, player.liveUpdateRating, recentAverage, prioritizeRecentForm);

                    return { 
                        player, card, ratingsForPos, performance, 
                        tier: manualTier, score: finalScore, 
                        position: ratedPos 
                    };
                }).filter((p): p is FlatPlayer => p !== null);
            })
        );
        setFlatPlayers(allFlatPlayers);
    }
  }, [players, prioritizeRecentForm]);


  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId } = values;
    if (!db) return;
    
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
        } else {
          card = { 
              id: uuidv4(), 
              name: cardName, 
              style: style, 
              league: league || 'Sin Liga',
              imageUrl: '',
              ratingsByPosition: { [position]: [rating] },
              manualTiersByPosition: { [position]: 'D' },
              buildsByPosition: {},
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
              manualTiersByPosition: { [position]: 'D' },
              buildsByPosition: {},
              attributeStats: {},
              physicalAttributes: {},
              skills: [],
          }],
        };
        await addDoc(collection(db, 'players'), newPlayer);
      }
      toast({ title: "Éxito", description: `La valoración para ${playerName} ha sido guardada.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la valoración." });
    }
  };

  const updateManualTier = async (playerId: string, cardId: string, position: Position, tier: Tier) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) return;
      
      const playerData = playerDoc.data() as Player;
      const newCards = JSON.parse(JSON.stringify(playerData.cards || [])) as PlayerCard[];
      const card = newCards.find(c => c.id === cardId);
      
      if (card) {
        if (!card.manualTiersByPosition) card.manualTiersByPosition = {};
        card.manualTiersByPosition[position] = tier;
        await updateDoc(playerRef, { cards: newCards });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el Tier." });
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
      if (cardToUpdate.manualTiersByPosition) delete cardToUpdate.manualTiersByPosition[position];
      
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
          if (card.ratingsByPosition[position]!.length === 0) {
              delete card.ratingsByPosition[position];
              if (card.manualTiersByPosition) delete card.manualTiersByPosition[position];
          }
          await updateDoc(playerRef, { cards: newCards });
          toast({ title: "Valoración Eliminada", description: "La valoración ha sido eliminada." });
      }
    } catch (error) {
        toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar la valoración." });
    }
  };
  
  const savePlayerBuild = async (playerId: string, cardId: string, position: Position, build: PlayerBuild) => {
    if (!db) return;
    const playerRef = doc(db, 'players', playerId);
    try {
        const playerDoc = await getDoc(playerRef);
        if (!playerDoc.exists()) throw new Error("Player not found");

        const playerData = playerDoc.data() as Player;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        const cardToUpdate = newCards.find(c => c.id === cardId);

        if (cardToUpdate) {
            if (!cardToUpdate.buildsByPosition) cardToUpdate.buildsByPosition = {};
            cardToUpdate.buildsByPosition[position] = { ...build, updatedAt: new Date().toISOString() };

            await updateDoc(playerRef, { cards: newCards });
            toast({ title: "Build Guardada", description: `Entrenamiento para ${position} actualizado.` });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la build." });
    }
  };

  const saveAttributeStats = async (playerId: string, cardId: string, stats: any, physical: any, skills: any) => {
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
          
          await setDoc(playerRef, { ...playerData, cards: newCards });
          toast({ title: "Atributos Guardados", description: `Atributos actualizados correctamente.` });
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

  return { players, flatPlayers, loading, error, addRating, editCard, editPlayer, deleteRating, savePlayerBuild, saveAttributeStats, downloadBackup, deletePositionRatings, updateLiveUpdateRating, resetAllLiveUpdateRatings, updateManualTier };
}