
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild, PlayerAttributeStats } from '@/lib/types';

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

    const q = query(collection(db, "idealBuilds"), orderBy("position"));

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
  
  const saveIdealBuild = async (build: IdealBuild) => {
    if (!db || !build.id) return;
    try {
        const buildRef = doc(db, 'idealBuilds', build.id);
        const docSnap = await getDoc(buildRef);

        if (docSnap.exists()) {
            const existingBuild = docSnap.data() as IdealBuild;
            const newBuildData = { ...existingBuild.build };
            let updatedFields = 0;

            for (const key in build.build) {
                const statKey = key as keyof PlayerAttributeStats;
                const newValue = Number(build.build[statKey] || 0);
                
                if(newValue > 0) {
                  const existingValue = Number(existingBuild.build[statKey] || 0);
                  // If existing value is 0, just take the new value, otherwise average them
                  newBuildData[statKey] = existingValue > 0 ? Math.round((existingValue + newValue) / 2) : newValue;
                  updatedFields++;
                }
            }
            
            await setDoc(buildRef, { ...build, build: newBuildData }, { merge: true });

            if (updatedFields > 0) {
              toast({ title: "Build Ideal Actualizada", description: `La build para ${build.position} - ${build.style} ha sido promediada y actualizada.` });
            } else {
              toast({ title: "Build Ideal Guardada", description: `La build para ${build.position} - ${build.style} se ha guardado sin cambios en las stats.` });
            }

        } else {
            // Document doesn't exist, create it.
            await setDoc(buildRef, build);
            toast({ title: "Build Ideal Creada", description: `La build para ${build.position} - ${build.style} se ha creado.` });
        }
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

    