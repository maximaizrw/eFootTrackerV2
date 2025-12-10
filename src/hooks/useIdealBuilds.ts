
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild } from '@/lib/types';

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

    const q = query(collection(db, "idealBuilds"), orderBy("position"), orderBy("style"));

    const unsub = onSnapshot(q, (snapshot) => {
      try {
        const buildsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as IdealBuild));
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
        await setDoc(buildRef, build, { merge: true });
        toast({ title: "Build Ideal Guardada", description: `La build para ${build.position} - ${build.style} se ha guardado.` });
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
