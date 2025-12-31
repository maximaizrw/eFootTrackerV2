

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDoc, getDocs } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild, PlayerAttributeStats, Player, PlayerCard, PlayerSkill } from '@/lib/types';
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
        const buildsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as IdealBuild));
        
        buildsData.sort((a, b) => {
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
                if (card.style === updatedBuild.style) {
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
        toast({
            variant: "destructive",
            title: "Error de Recálculo",
            description: `Se guardó la build, pero no se pudo recalcular la afinidad para todos los jugadores.`,
        });
    }
  };
  
  const saveIdealBuild = async (build: IdealBuild) => {
    if (!db || !build.id) return;
    try {
        const buildRef = doc(db, 'idealBuilds', build.id);
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
            toastMessage = `La build para ${build.position} - ${build.style} ha sido promediada y actualizada.`;
            finalIdealBuild = { ...build, build: finalBuildData };

        } else {
            finalBuildData = build.build;
            toastMessage = `La build para ${build.position} - ${build.style} se ha creado.`;
            finalIdealBuild = { ...build, build: finalBuildData };
        }
        
        // Ensure legLength and skills are handled correctly
        const dataToSave: Partial<IdealBuild> = {
          position: finalIdealBuild.position,
          style: finalIdealBuild.style,
          build: finalIdealBuild.build,
        };

        if (finalIdealBuild.legLength && (finalIdealBuild.legLength.min !== undefined || finalIdealBuild.legLength.max !== undefined)) {
          dataToSave.legLength = {};
          if (finalIdealBuild.legLength.min !== undefined) {
            dataToSave.legLength.min = finalIdealBuild.legLength.min;
          }
          if (finalIdealBuild.legLength.max !== undefined) {
            dataToSave.legLength.max = finalIdealBuild.legLength.max;
          }
        }
        
        if (finalIdealBuild.primarySkills && finalIdealBuild.primarySkills.length > 0) {
          dataToSave.primarySkills = finalIdealBuild.primarySkills;
        }
        if (finalIdealBuild.secondarySkills && finalIdealBuild.secondarySkills.length > 0) {
          dataToSave.secondarySkills = finalIdealBuild.secondarySkills;
        }

        await setDoc(buildRef, dataToSave, { merge: true });
        toast({ title: "Build Ideal Guardada", description: toastMessage });

        // Recalculate affinities for all players affected by this build change
        await recalculateAllRelevantAffinities({ ...dataToSave, id: build.id } as IdealBuild);

    } catch (error) {
        console.error("Error saving ideal build: ", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: `No se pudo guardar la build ideal.`,
        });
    }
  };

  const deleteIdealBuild = async (buildId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'idealBuilds', buildId));
      toast({ title: "Build Ideal Eliminada", description: "La build ideal ha sido eliminada." });
    } catch (error) {
      console.error("Error deleting ideal build:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar la build ideal.",
      });
    }
  };

  return { idealBuilds, loading, error, saveIdealBuild, deleteIdealBuild };
}
