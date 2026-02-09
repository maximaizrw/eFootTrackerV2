
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDoc, getDocs } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild, PlayerAttributeStats, Player, PlayerCard, PlayerSkill, IdealBuildType } from '@/lib/types';
import { calculateProgressionStats, getIdealBuildForPlayer, calculateAffinityWithBreakdown } from '@/lib/utils';

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
        const buildsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                playStyle: data.playStyle || 'General', // Fallback for old data
            } as IdealBuild;
        });
        
        buildsData.sort((a, b) => {
          if (a.playStyle < b.playStyle) return -1;
          if (a.playStyle > b.playStyle) return 1;
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          if (a.style < b.style) return -1;
          if (a.style > b.style) return 1;
          return 0;
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
                // If the card matches the style, we might need to update based on the current active ideal type
                // But since we can't know the user's active UI selection here easily, 
                // we'll update the build's stored manualAffinity if the style matches.
                if (card.style === updatedBuild.style) {
                    if (card.buildsByPosition && card.buildsByPosition[updatedBuild.position]) {
                        const currentBuild = card.buildsByPosition[updatedBuild.position]!
                        const isGoalkeeper = updatedBuild.position === 'PT';
                        const finalStats = calculateProgressionStats(card.attributeStats || {}, currentBuild, isGoalkeeper);

                        // Use the updated build specifically for this recalculation
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
    
    // Construct unique ID based on type, position and style
    const buildId = `${build.playStyle}-${build.position}-${build.style}`;
    
    try {
        const buildRef = doc(db, 'idealBuilds', buildId);
        const docSnap = await getDoc(buildRef);

        let finalBuildData: PlayerAttributeStats = {};
        let toastMessage = "";
        let finalIdealBuild: IdealBuild;

        if (docSnap.exists()) {
            const existingBuild = docSnap.data() as IdealBuild;
            finalBuildData = { ...existingBuild.build };
            
            for (const key in build.build) {
                const statKey = key as keyof PlayerAttributeStats;
                const newValue = Number(build.build[statKey]);
                
                if(!isNaN(newValue) && newValue > 0) {
                  const existingValue = Number(existingBuild.build[statKey] || 0);
                  finalBuildData[statKey] = existingValue > 0 ? Math.round((existingValue + newValue) / 2) : newValue;
                }
            }
            toastMessage = `La build para [${build.playStyle}] ${build.position} - ${build.style} ha sido promediada.`;
            finalIdealBuild = { ...build, build: finalBuildData };

        } else {
            finalBuildData = build.build;
            toastMessage = `La build para [${build.playStyle}] ${build.position} - ${build.style} se ha creado.`;
            finalIdealBuild = { ...build, build: finalBuildData };
        }
        
        const dataToSave: Partial<IdealBuild> = {
          playStyle: finalIdealBuild.playStyle,
          position: finalIdealBuild.position,
          style: finalIdealBuild.style,
          build: finalIdealBuild.build,
        };

        if (finalIdealBuild.legLength && (finalIdealBuild.legLength.min !== undefined || finalIdealBuild.legLength.max !== undefined)) {
          dataToSave.legLength = {};
          if (finalIdealBuild.legLength.min !== undefined) dataToSave.legLength.min = finalIdealBuild.legLength.min;
          if (finalIdealBuild.legLength.max !== undefined) dataToSave.legLength.max = finalIdealBuild.legLength.max;
        }
        
        if (finalIdealBuild.primarySkills && finalIdealBuild.primarySkills.length > 0) dataToSave.primarySkills = finalIdealBuild.primarySkills;
        if (finalIdealBuild.secondarySkills && finalIdealBuild.secondarySkills.length > 0) dataToSave.secondarySkills = finalIdealBuild.secondarySkills;

        await setDoc(buildRef, dataToSave, { merge: true });
        toast({ title: "Build Ideal Guardada", description: toastMessage });

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
