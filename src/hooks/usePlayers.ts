
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerCard, Position, PlayerBuild, FlatPlayer, LiveUpdateRating, PlayerSkill, PlayerAttributeStats, PhysicalAttribute, Nationality, League, IdealRoleBuild } from '@/lib/types';
import type { FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import { getAvailableStylesForPosition, playerSkillsList } from '@/lib/types';
import { normalizeText, normalizeStyleName, calculateStats, calculateRoleRating, calculateOverall, calculateRecencyWeightedAverage, resolveIdealBuild } from '@/lib/utils';

export function usePlayers(idealBuilds: IdealRoleBuild[], prioritizeRecentForm: boolean = false) {
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
            const newCards: PlayerCard[] = (data.cards || []).map((card: any) => ({
                ...card,
                id: card.id || uuidv4(),
                style: normalizeStyleName(card.style),
                ratingsByPosition: card.ratingsByPosition || {},
                buildsByPosition: card.buildsByPosition || {},
                skills: (card.skills || []).filter((s: string) => validSkillsSet.has(s as any)),
            }));

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
                
                const availableStylesForPos = getAvailableStylesForPosition(ratedPos, false);
                const effectiveRole = availableStylesForPos.includes(card.style) ? card.style : 'Ninguno';
                const idealBuild = resolveIdealBuild(ratedPos, effectiveRole, idealBuilds);
                const roleRating = calculateRoleRating(card.attributeStats, card.skills || [], idealBuild);
                const overall = calculateOverall(roleRating, stats.average, stats.matches, player.liveUpdateRating, recentAverage, prioritizeRecentForm);

                return { 
                    player, card, ratingsForPos, performance: { stats, isHotStreak: false, isConsistent: false, isPromising: false, isVersatile: playerPositions.length >= 3 }, 
                    roleRating, overall, position: ratedPos, idealBuild 
                } as FlatPlayer;
            }).filter((p): p is FlatPlayer => p !== null);
        })
    );
    setFlatPlayers(allFlatPlayers);
  }, [players, prioritizeRecentForm, idealBuilds]);

  const addRating = async (values: AddRatingFormValues) => {
    let { playerName, cardName, position, rating, style, league, nationality, playerId } = values;
    if (!db) return;
    
    const pos = position as Position;
    style = normalizeStyleName(style) as any;
    const validStylesForPosition = getAvailableStylesForPosition(pos, true);
    if (!validStylesForPosition.includes(style)) style = 'Ninguno';

    try {
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
        } else {
          newCards.push({ id: uuidv4(), name: cardName, style, league: league || 'Sin Liga', ratingsByPosition: { [pos]: [rating] } } as any);
        }
        await updateDoc(playerRef, { cards: newCards });
      } else {
        await addDoc(collection(db, 'players'), {
          name: playerName,
          nationality,
          cards: [{ id: uuidv4(), name: cardName, style, league: league || 'Sin Liga', ratingsByPosition: { [pos]: [rating] } }]
        });
      }
      toast({ title: "Valoración guardada" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };



  const savePositionNote = async (position: Position, text: string) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'positionNotes', position), { text });
    } catch (e) { toast({ variant: "destructive", title: "Error al guardar nota" }); }
  };

  const savePlayerBuild = async (playerId: string, cardId: string, position: Position, build: PlayerBuild) => {
    if (!db) return;
    try {
        const playerRef = doc(db, 'players', playerId);
        const playerDoc = await getDoc(playerRef);
        const playerData = playerDoc.data() as Player;
        const newCards: PlayerCard[] = JSON.parse(JSON.stringify(playerData.cards || []));
        const card = newCards.find(c => c.id === cardId);
        if (card) {
            if (!card.buildsByPosition) card.buildsByPosition = {};
            card.buildsByPosition[position] = build;
            await updateDoc(playerRef, { cards: newCards });
            toast({ title: "Entrenamiento guardado" });
        }
    } catch (e) { toast({ variant: "destructive", title: "Error al guardar build" }); }
  };

  const updateFullPlayerData = async (playerId: string, cardId: string, position: Position, data: {
    build: PlayerBuild;
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
      
      const playerData = playerDoc.data() as Player;
      const newCards = playerData.cards.map(card => {
        if (card.id === cardId) {
          const updatedBuilds = { ...card.buildsByPosition, [position]: data.build };
          return {
            ...card,
            imageUrl: data.imageUrl || card.imageUrl,
            attributeStats: data.stats,
            physicalAttributes: data.physical,
            skills: data.skills,
            buildsByPosition: updatedBuilds,
            league: data.league || card.league,
          };
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
    try { await updateDoc(doc(db, 'players', playerId), { liveUpdateRating: rating }); } catch (e) {}
  };

  const resetAllLiveUpdateRatings = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, 'players'));
      for (const d of snap.docs) {
        const data = d.data();
        if (!data.permanentLiveUpdateRating) await updateDoc(doc(db, 'players', d.id), { liveUpdateRating: null });
      }
      toast({ title: "Letras reiniciadas" });
    } catch (e) {}
  };

  const editCard = async (values: any) => {
    if (!db) return;
    try {
      const playerRef = doc(db, 'players', values.playerId);
      const playerDoc = await getDoc(playerRef);
      const playerData = playerDoc.data() as Player;
      const newCards = playerData.cards.map(c => 
        c.id === values.cardId ? { ...c, name: values.currentCardName, style: values.currentStyle, league: values.league, imageUrl: values.imageUrl } : c
      );
      await updateDoc(playerRef, { cards: newCards });
      toast({ title: "Carta actualizada" });
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
        card.ratingsByPosition[position].splice(index, 1);
        if (card.ratingsByPosition[position].length === 0) delete card.ratingsByPosition[position];
        await updateDoc(playerRef, { cards: newCards });
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
    addRating, savePositionNote, savePlayerBuild, 
    deletePositionRatings, updateLiveUpdateRating, resetAllLiveUpdateRatings,
    editCard, editPlayer, deleteRating, downloadBackup, saveAttributeStats, updateFullPlayerData
  };
}
