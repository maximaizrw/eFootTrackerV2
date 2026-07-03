
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, FlatPlayer, LiveUpdateRating, PlayerSkill, PlayerAttributeStats, PhysicalAttribute, Nationality, League, PlayerRatingEntry } from '@/lib/types';
import type { FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import type { AddPlayerFormValues } from '@/components/add-player-dialog';
import { getAvailableStylesForPosition, playerSkillsList } from '@/lib/types';
import { normalizeText, normalizeStyleName, normalizePlayerTier, normalizeTierPlacements, calculateStats, calculateOverall, calculateRecencyWeightedAverage, calculatePlayerConfidence, getCardTierForPosition, getCardTierPlacementsForPosition, getCardTierUpdatedAtForPosition } from '@/lib/utils';

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [flatPlayers, setFlatPlayers] = useState<FlatPlayer[]>([]);
  const [positionNotes, setPositionNotes] = useState<Record<string, string>>({});
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
        const playerList = snapshot.docs.map(doc => {
            const data = doc.data();
            const newCards: PlayerCard[] = (data.cards || []).map((card: any) => {
                const tierByPosition = Object.fromEntries(
                    Object.entries(card.tierByPosition || {}).map(([position, tier]) => [position, normalizePlayerTier(tier as any)])
                );
                const tierPlacementsByPosition = Object.fromEntries(
                    Object.entries(card.tierPlacementsByPosition || {}).map(([position, placements]) => [
                        position,
                        normalizeTierPlacements(card.tierByPosition?.[position as Position] || card.tier, placements as any),
                    ])
                );

                return {
                    ...card,
                    id: card.id || uuidv4(),
                    style: normalizeStyleName(card.style),
                    tier: normalizePlayerTier(card.tier),
                    tierPlacements: normalizeTierPlacements(card.tier, card.tierPlacements),
                    tierUpdatedAt: card.tierUpdatedAt,
                    tierByPosition,
                    tierPlacementsByPosition,
                    tierUpdatedAtByPosition: card.tierUpdatedAtByPosition || {},
                    ratingsByPosition: card.ratingsByPosition || {},
                    likesByPosition: card.likesByPosition || {},
                    ratingEntriesByPosition: card.ratingEntriesByPosition || {},
                    skills: (card.skills || []).filter((s: string) => validSkillsSet.has(s as any)),
                };
            });

            return {
                id: doc.id,
                ...data,
                cards: newCards,
            } as Player;
        });

        setPlayers(playerList);
        setError(null);
      } catch (err) {
          setError("Error al procesar jugadores.");
      } finally {
        setLoading(false);
      }
    });

    const unsubNotes = onSnapshot(collection(db, "positionNotes"), (snapshot) => {
        const notes: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
            notes[doc.id] = doc.data().text || '';
        });
        setPositionNotes(notes);
    });

    return () => {
        unsubPlayers();
        unsubNotes();
    };
  }, [validSkillsSet]);

  useEffect(() => {
    const allFlatPlayers = players.flatMap(player => 
        (player.cards || []).flatMap(card => {
            const playerPositions = Object.keys(card.ratingsByPosition || {}) as Position[];
            
            return playerPositions.map(ratedPos => {
                const ratingsForPos = card.ratingsByPosition?.[ratedPos] || [];
                if (ratingsForPos.length === 0) return null;

                const stats = calculateStats(ratingsForPos);
                const recentAverage = calculateRecencyWeightedAverage(ratingsForPos, 5, 2.5, 0.9);

                const likesForPos = card.likesByPosition?.[ratedPos] || [];
                const likes = likesForPos.filter(l => l === true).length;
                const dislikes = likesForPos.filter(l => l === false).length;
                const tier = getCardTierForPosition(card, ratedPos);
                const tierPlacements = getCardTierPlacementsForPosition(card, ratedPos);
                const tierUpdatedAt = getCardTierUpdatedAtForPosition(card, ratedPos);
                const overall = calculateOverall(stats.average, stats.matches, likes, dislikes, player.liveUpdateRating, recentAverage, tier, tierPlacements);
                const confidence = calculatePlayerConfidence(stats.average, stats.matches, stats.stdDev, likes, dislikes, player.liveUpdateRating, recentAverage);

                return {
                    player,
                    card,
                    ratingsForPos,
                    likesForPos,
                    performance: {
                      stats,
                      recentAverage: confidence.recentAverage,
                      confidenceScore: confidence.score,
                      trendDelta: confidence.trendDelta,
                      tag: confidence.tag,
                      isHotStreak: confidence.tag === 'racha',
                      isConsistent: confidence.tag === 'fijo' || confidence.tag === 'estable',
                      isPromising: confidence.tag === 'promesa',
                      isVersatile: playerPositions.length >= 3
                    },
                    overall,
                    confidenceScore: confidence.score,
                    position: ratedPos,
                    tier,
                    tierPlacements,
                    tierUpdatedAt,
                } as FlatPlayer;
            }).filter((p): p is FlatPlayer => p !== null);
        })
    );
    setFlatPlayers(allFlatPlayers);
  }, [players]);

  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId, trainedPosition } = values as any;
    if (!db) return;
    
    const pos = position as Position;
    style = normalizeStyleName(style) as any;
    const validStylesForPosition = getAvailableStylesForPosition(pos, true);
    if (!validStylesForPosition.includes(style)) style = 'Ninguno';

    try {
      const ratingEntry: PlayerRatingEntry = {
        rating,
        liked: values.liked ?? null,
        position: pos,
        date: new Date().toISOString(),
      };
      if ((values as any).formationId) ratingEntry.formationId = (values as any).formationId;
      if ((values as any).formationName) ratingEntry.formationName = (values as any).formationName;

      if (playerId) {
        const playerRef = doc(db, 'players', playerId);
        const playerDoc = await getDoc(playerRef);
        const playerData = playerDoc.data() as Player;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        let card = newCards.find(c => normalizeText(c.name) === normalizeText(cardName));

        if (card) {
          if (!card.ratingsByPosition) card.ratingsByPosition = {};
          if (!card.ratingsByPosition[pos]) card.ratingsByPosition[pos] = [];
          card.ratingsByPosition[pos]!.push(rating);

          if (!card.likesByPosition) card.likesByPosition = {};
          if (!card.likesByPosition[pos]) card.likesByPosition[pos] = [];
          card.likesByPosition[pos]!.push(values.liked ?? null);

          if (!card.ratingEntriesByPosition) card.ratingEntriesByPosition = {};
          if (!card.ratingEntriesByPosition[pos]) card.ratingEntriesByPosition[pos] = [];
          card.ratingEntriesByPosition[pos]!.push(ratingEntry);

          if (trainedPosition !== undefined) card.trainedPosition = trainedPosition;
          card.lastPlayedPosition = pos;
        } else {
          newCards.push({
            id: uuidv4(),
            name: cardName,
            style,
            tier: 'SIN TIER',
            tierPlacements: 0,
            tierUpdatedAt: new Date().toISOString(),
            tierByPosition: { [pos]: 'SIN TIER' },
            tierPlacementsByPosition: { [pos]: 0 },
            tierUpdatedAtByPosition: { [pos]: new Date().toISOString() },
            league: league || 'Sin Liga',
            ratingsByPosition: { [pos]: [rating] },
            likesByPosition: { [pos]: [values.liked ?? null] },
            ratingEntriesByPosition: { [pos]: [ratingEntry] },
          } as any);
        }
        await updateDoc(playerRef, { cards: newCards });
      } else {
        await addDoc(collection(db, 'players'), {
          name: playerName,
          nationality,
          cards: [{
            id: uuidv4(),
            name: cardName,
            style,
            tier: 'SIN TIER',
            tierPlacements: 0,
            tierUpdatedAt: new Date().toISOString(),
            tierByPosition: { [pos]: 'SIN TIER' },
            tierPlacementsByPosition: { [pos]: 0 },
            tierUpdatedAtByPosition: { [pos]: new Date().toISOString() },
            league: league || 'Sin Liga',
            ratingsByPosition: { [pos]: [rating] },
            likesByPosition: { [pos]: [values.liked ?? null] },
            ratingEntriesByPosition: { [pos]: [ratingEntry] },
          }]
        });
      }
      toast({ title: "Valoración guardada" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };



  const addPlayer = async (values: AddPlayerFormValues): Promise<string | null> => {
    if (!db) return null;
    const {
      playerName, cardName, imageUrl, nationality, style, league, tier, tierPlacements,
      height, weight, skills, playerId, ratingEntries,
      ...statFields
    } = values;

    const attributeStats: PlayerAttributeStats = {};
    for (const [key, val] of Object.entries(statFields)) {
      const numericValue = Number(val);
      if (val !== undefined && val !== null && Number.isFinite(numericValue)) {
        (attributeStats as any)[key] = numericValue;
      }
    }

    const ratingsByPosition: { [key: string]: number[] } = {};
    const ratingEntriesByPosition: { [key: string]: PlayerRatingEntry[] } = {};
    const tierByPosition: { [key: string]: string } = {};
    const tierPlacementsByPosition: { [key: string]: number } = {};
    const tierUpdatedAtByPosition: { [key: string]: string } = {};
    const now = new Date().toISOString();
    if (ratingEntries && ratingEntries.length > 0) {
      for (const entry of ratingEntries) {
        const entryTier = normalizePlayerTier((entry as any).tier || tier);
        const entryTierPlacements = normalizeTierPlacements(entryTier, (entry as any).tierPlacements ?? tierPlacements);

        if (!ratingsByPosition[entry.position]) ratingsByPosition[entry.position] = [];
        ratingsByPosition[entry.position].push(entry.rating);
        if (!ratingEntriesByPosition[entry.position]) ratingEntriesByPosition[entry.position] = [];
        ratingEntriesByPosition[entry.position].push({
          rating: entry.rating,
          liked: null,
          position: entry.position,
          date: new Date().toISOString(),
        });
        tierByPosition[entry.position] = entryTier;
        tierPlacementsByPosition[entry.position] = entryTierPlacements;
        tierUpdatedAtByPosition[entry.position] = now;
      }
    }

    const newCard: any = {
      id: uuidv4(),
      name: cardName,
      style: style || 'Ninguno',
      tier: normalizePlayerTier(tier),
      tierPlacements: normalizeTierPlacements(tier, tierPlacements),
      tierUpdatedAt: now,
      tierByPosition,
      tierPlacementsByPosition,
      tierUpdatedAtByPosition,
      league: league || 'Sin Liga',
      imageUrl: imageUrl || '',
      ratingsByPosition,
      likesByPosition: {},
      ratingEntriesByPosition,
    };
    if (Object.keys(attributeStats).length > 0) newCard.attributeStats = attributeStats;
    if (height || weight) newCard.physicalAttributes = { ...(height ? { height } : {}), ...(weight ? { weight } : {}) };
    if (skills && skills.length > 0) newCard.skills = skills;

    const stripInvalidFirestoreValues = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(stripInvalidFirestoreValues);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([, value]) => value !== undefined && !(typeof value === 'number' && !Number.isFinite(value)))
            .map(([key, value]) => [key, stripInvalidFirestoreValues(value)])
        );
      }
      return obj;
    };

    try {
      if (playerId) {
        const existingPlayer = players.find(p => p.id === playerId);
        if (existingPlayer) {
          const playerRef = doc(db, 'players', existingPlayer.id);
          await updateDoc(playerRef, stripInvalidFirestoreValues({ cards: [...existingPlayer.cards, newCard] }));
          toast({ title: "Carta agregada", description: `Vinculada a ${existingPlayer.name}.` });
          return existingPlayer.id;
        }
      }

      const ref = await addDoc(collection(db, 'players'), stripInvalidFirestoreValues({
        name: playerName,
        nationality: nationality || 'Sin Nacionalidad',
        cards: [newCard],
      }));
      toast({ title: "Jugador guardado" });
      return ref.id;
    } catch (error) {
      console.error("Error al guardar jugador:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar jugador",
        description: error instanceof Error ? error.message : "Revisá la consola para ver el detalle.",
      });
      return null;
    }
  };

  const savePositionNote = async (position: Position, text: string) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'positionNotes', position), { text });
    } catch (e) { toast({ variant: "destructive", title: "Error al guardar nota" }); }
  };


  const updateFullPlayerData = async (playerId: string, cardId: string, position: Position, data: {
    imageUrl?: string;
    stats: PlayerAttributeStats;
    physical: PhysicalAttribute;
    skills: PlayerSkill[];
    nationality?: Nationality;
    league?: League;
  }) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) return;
      
      // Helper to remove all undefined fields (Firebase rejects undefined)
      const stripUndefined = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(stripUndefined);
        if (obj !== null && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, stripUndefined(v)])
          );
        }
        return obj;
      };

      const playerData = playerDoc.data() as Player;
      const newCards = playerData.cards.map(card => {
        if (card.id === cardId) {
          const updatedCard: any = {
            ...card,
            imageUrl: data.imageUrl || card.imageUrl,
            attributeStats: data.stats,
            physicalAttributes: data.physical,
            skills: data.skills,
            league: data.league || card.league,
          };
          return stripUndefined(updatedCard);
        }
        return card;
      });

      const updatePayload: any = { cards: newCards };
      if (data.nationality) {
        updatePayload.nationality = data.nationality;
      }

      await updateDoc(playerRef, updatePayload);
      toast({ title: "Datos actualizados", description: "Se han guardado todos los cambios manuales." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al actualizar" });
    }
  };

  const updateLike = async (playerId: string, cardId: string, position: Position, index: number, liked: boolean | null) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      if (!playerDoc.exists()) return;

      const playerData = playerDoc.data() as Player;
      const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards));
      const card = newCards.find(c => c.id === cardId);
      if (card) {
        if (!card.likesByPosition) card.likesByPosition = {};
        if (!card.likesByPosition[position]) card.likesByPosition[position] = [];
        card.likesByPosition[position]![index] = liked;
        const entriesForPosition = card.ratingEntriesByPosition?.[position];
        if (entriesForPosition) {
          const ratingsCount = card.ratingsByPosition?.[position]?.length || 0;
          const legacyOffset = Math.max(0, ratingsCount - entriesForPosition.length);
          const entryIndex = index - legacyOffset;
          if (entryIndex >= 0 && entriesForPosition[entryIndex]) {
            entriesForPosition[entryIndex].liked = liked;
          }
        }
        await updateDoc(playerRef, { cards: newCards });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error al actualizar valoración" });
    }
  };

  const deletePositionRatings = async (playerId: string, cardId: string, position: Position) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards));
      const card = newCards.find(c => c.id === cardId);
      if (card?.ratingsByPosition?.[position]) {
          delete card.ratingsByPosition[position];
          if (card.likesByPosition?.[position]) delete card.likesByPosition[position];
          if (card.ratingEntriesByPosition?.[position]) delete card.ratingEntriesByPosition[position];
          if (card.tierByPosition?.[position]) delete card.tierByPosition[position];
          if (card.tierPlacementsByPosition?.[position] !== undefined) delete card.tierPlacementsByPosition[position];
          if (card.tierUpdatedAtByPosition?.[position]) delete card.tierUpdatedAtByPosition[position];

          const hasRatings = Object.keys(card.ratingsByPosition).length > 0;
          const finalCards = hasRatings ? newCards : newCards.filter(c => c.id !== cardId);
          if (finalCards.length === 0) await deleteDoc(playerRef);
          else await updateDoc(playerRef, { cards: finalCards });
          toast({ title: "Posición eliminada" });
      }
    } catch (e) { toast({ variant: "destructive", title: "Error al eliminar" }); }
  };

  const updateLiveUpdateRating = async (playerId: string, rating: LiveUpdateRating | null) => {
    if (!db) return;
    try {
      const player = players.find(p => p.id === playerId);
      const targets = player
        ? players.filter(p => normalizeText(p.name) === normalizeText(player.name))
        : [{ id: playerId }];
      await Promise.all(targets.map(p => updateDoc(doc(db!, 'players', p.id), { liveUpdateRating: rating })));
    } catch (e) {}
  };

  const updatePermanentLiveUpdateRating = async (playerId: string, isPermanent: boolean) => {
    if (!db) return;
    try {
      const player = players.find(p => p.id === playerId);
      const targets = player
        ? players.filter(p => normalizeText(p.name) === normalizeText(player.name))
        : [{ id: playerId }];
      await Promise.all(targets.map(p => updateDoc(doc(db!, 'players', p.id), { permanentLiveUpdateRating: isPermanent })));
      toast({ title: isPermanent ? "Letra marcada como permanente" : "Letra permanente desactivada" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al actualizar letra permanente" });
    }
  };

  const resetAllLiveUpdateRatings = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, 'players'));
      for (const d of snap.docs) {
        const data = d.data();
        if (!data.permanentLiveUpdateRating) await updateDoc(doc(db, 'players', d.id), { liveUpdateRating: null });
      }
      toast({ title: "Letras reiniciadas", description: "Se mantuvieron los jugadores con letra permanente." });
    } catch (e) {}
  };

  const editCard = async (values: any) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', values.playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const now = new Date().toISOString();
      const newCards = playerData.cards.map(c => {
        if (c.id !== values.cardId) return c;

        const updatedCard: PlayerCard = {
          ...c,
          name: values.currentCardName,
          style: values.currentStyle,
          league: values.league,
          imageUrl: values.imageUrl,
          trainedPosition: values.trainedPosition ?? null,
        };

        if (values.position) {
          const position = values.position as Position;
          const tier = normalizePlayerTier(values.tier);
          updatedCard.tierByPosition = { ...(updatedCard.tierByPosition || {}), [position]: tier };
          updatedCard.tierPlacementsByPosition = {
            ...(updatedCard.tierPlacementsByPosition || {}),
            [position]: normalizeTierPlacements(tier, values.tierPlacements),
          };
          updatedCard.tierUpdatedAtByPosition = { ...(updatedCard.tierUpdatedAtByPosition || {}), [position]: now };
        } else {
          updatedCard.tier = normalizePlayerTier(values.tier);
          updatedCard.tierPlacements = normalizeTierPlacements(values.tier, values.tierPlacements);
          updatedCard.tierUpdatedAt = now;
        }

        return updatedCard;
      });
      await updateDoc(playerRef, { cards: newCards });
      toast({ title: "Carta actualizada" });
    } catch (e) {}
  };

  const updateTrainedPosition = async (playerId: string, cardId: string, position: Position | null) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const newCards = playerData.cards.map(c =>
        c.id === cardId ? { ...c, trainedPosition: position } : c
      );
      await updateDoc(playerRef, { cards: newCards });
    } catch (e) {}
  };

  const editPlayer = async (values: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'players', values.playerId), { name: values.currentPlayerName, nationality: values.nationality, permanentLiveUpdateRating: values.permanentLiveUpdateRating });
      toast({ title: "Jugador actualizado" });
    } catch (e) {}
  };

  const deleteRating = async (playerId: string, cardId: string, position: Position, index: number) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const newCards = JSON.parse(JSON.stringify(playerData.cards));
      const card = newCards.find((c: any) => c.id === cardId);
      if (card?.ratingsByPosition?.[position]) {
        const entriesForPosition = card.ratingEntriesByPosition?.[position];
        if (entriesForPosition) {
          const legacyOffset = Math.max(0, card.ratingsByPosition[position].length - entriesForPosition.length);
          const entryIndex = index - legacyOffset;
          if (entryIndex >= 0) entriesForPosition.splice(entryIndex, 1);
        }
        card.ratingsByPosition[position].splice(index, 1);
        if (card.likesByPosition?.[position]) card.likesByPosition[position].splice(index, 1);
        if (card.ratingsByPosition[position].length === 0) {
          delete card.ratingsByPosition[position];
          if (card.tierByPosition?.[position]) delete card.tierByPosition[position];
          if (card.tierPlacementsByPosition?.[position] !== undefined) delete card.tierPlacementsByPosition[position];
          if (card.tierUpdatedAtByPosition?.[position]) delete card.tierUpdatedAtByPosition[position];
        }
        if (card.likesByPosition?.[position]?.length === 0) delete card.likesByPosition[position];
        if (card.ratingEntriesByPosition?.[position]?.length === 0) delete card.ratingEntriesByPosition[position];

        // Remove cards with no positions; delete player doc if no cards remain
        const activeCards = newCards.filter((c: any) => Object.keys(c.ratingsByPosition || {}).length > 0);
        if (activeCards.length === 0) {
          await deleteDoc(playerRef);
        } else {
          await updateDoc(playerRef, { cards: activeCards });
        }
        toast({ title: "Valoración eliminada" });
      }
    } catch (e) {}
  };

  const downloadBackup = async () => {
    if (!db) return null;
    const snap = await getDocs(collection(db, 'players'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const saveAttributeStats = async (playerId: string, cardId: string, stats: any, physical: any, skills: any) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const newCards = playerData.cards.map(c => 
        c.id === cardId ? { ...c, attributeStats: stats, physicalAttributes: physical, skills: skills } : c
      );
      await updateDoc(playerRef, { cards: newCards });
      toast({ title: "Atributos guardados" });
    } catch (e) {}
  };



  return {
    players, flatPlayers, positionNotes, loading, error,
    addRating, addPlayer, savePositionNote,
    deletePositionRatings, updateLiveUpdateRating, updatePermanentLiveUpdateRating, resetAllLiveUpdateRatings,
    editCard, editPlayer, deleteRating, downloadBackup, saveAttributeStats, updateFullPlayerData, updateLike, updateTrainedPosition
  };
}
