'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDoc, getDocs } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild, PlayerAttributeStats, Player, PlayerCard, PlayerSkill, IdealBuildType } from '@/lib/types';
import { calculateProgressionStats, getIdealBuildForPlayer, calculateAffinityWithBreakdown, normalizeStyleName } from '@/lib/utils';

export function useIdealBuilds() {
  const [idealBuilds, setIdealBuilds] = useState<IdealBuild[]>([]);
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

    const q = query(collection(db, "idealBuilds"));

    const unsub = onSnapshot(q, (snapshot) => {
      try {
        const buildsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            style: normalizeStyleName(doc.data().style),
            playStyle: 'Contraataque largo',
        } as IdealBuild));
        
        buildsData.sort((a, b) => {
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          const styleA = normalizeStyleName(a.style);
          const styleB = normalizeStyleName(b.style);
          if (styleA < styleB) return -1;
          if (styleA > styleB) return 1;
          return (a.profileName || '') < (b.profileName || '') ? -1 : 1;
        });

        setIdealBuilds(buildsData);
        setError(null);
      } catch (err) {
        console.error("Error processing ideal builds snapshot: ", err);
        setError("No se pudieron procesar los datos de las builds ideales.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching ideal builds from Firestore: ", err);
      setError("No se pudo conectar a la base de datos para leer las builds ideales.");
      setIdealBuilds([]);
      setLoading(false);
    });

    return () => unsub();
  }, [toast]);

  const recalculateAllRelevantAffinities = async (updatedBuild: IdealBuild) => {
    if (!db) return;
    try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        for (const playerDoc of playersSnapshot.docs) {
            const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
            let playerWasUpdated = false;
            const newCards = JSON.parse(JSON.stringify(player.cards)) as PlayerCard[];

            newCards.forEach(card => {
                if (normalizeStyleName(card.style) === normalizeStyleName(updatedBuild.style)) {
                    if (card.buildsByPosition && card.buildsByPosition[updatedBuild.position]) {
                        const currentBuild = card.buildsByPosition[updatedBuild.position]!
                        const isGoalkeeper = updatedBuild.position === 'PT';
                        const finalStats = calculateProgressionStats(card.attributeStats || {}, currentBuild, isGoalkeeper);

                        const { totalAffinityScore } = calculateAffinityWithBreakdown(finalStats, updatedBuild, card.physicalAttributes, card.skills);
                        
                        currentBuild.manualAffinity = totalAffinityScore;
                        currentBuild.updatedAt = new Date().toISOString();
                        playerWasUpdated = true;
                    }
                }
            });

            if (playerWasUpdated) {
                await setDoc(doc(db, 'players', player.id), { ...player, cards: newCards });
            }
        }
    } catch (recalcError) {
        console.error("Error recalculating affinities globally:", recalcError);
    }
  };
  
  const saveIdealBuild = async (build: IdealBuild) => {
    if (!db) return;
    
    // Unique ID combining tactica, position, style and custom profile name
    const profilePart = build.profileName ? `-${build.profileName.trim().replace(/\s+/g, '_')}` : '';
    const buildId = `Contraataque_largo-${build.position}-${build.style.replace(/\s+/g, '_')}${profilePart}`;
    
    try {
        const buildRef = doc(db, 'idealBuilds', buildId);
        
        const dataToSave: any = {
          playStyle: 'Contraataque largo',
          position: build.position,
          style: build.style,
          profileName: build.profileName || "",
          build: build.build,
        };

        if (build.height && (build.height.min !== undefined || build.height.max !== undefined)) {
          dataToSave.height = build.height;
        }
        if (build.weight && (build.weight.min !== undefined || build.weight.max !== undefined)) {
          dataToSave.weight = build.weight;
        }
        
        if (build.primarySkills && build.primarySkills.length > 0) dataToSave.primarySkills = build.primarySkills;
        if (build.secondarySkills && build.secondarySkills.length > 0) dataToSave.secondarySkills = build.secondarySkills;

        await setDoc(buildRef, dataToSave, { merge: true });
        toast({ title: "Build Ideal Guardada", description: `La build para ${build.position} - ${build.style}${build.profileName ? ` (${build.profileName})` : ''} se ha guardado.` });

        await recalculateAllRelevantAffinities({ ...dataToSave, id: buildId } as IdealBuild);

    } catch (error) {
        console.error("Error saving ideal build: ", error);
        toast({ variant: "destructive", title: "Error al Guardar", description: `No se pudo guardar la build ideal.` });
    }
  };

  const deleteIdealBuild = async (buildId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'idealBuilds', buildId));
      toast({ title: "Build Ideal Eliminada", description: "La build ideal ha sido eliminada." });
    } catch (error) {
      console.error("Error deleting ideal build:", error);
      toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar la build ideal." });
    }
  };

  return { idealBuilds, loading, error, saveIdealBuild, deleteIdealBuild };
}
