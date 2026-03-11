'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealRoleBuild } from '@/lib/types';

export function useIdealBuilds() {
  const [idealBuilds, setIdealBuilds] = useState<IdealRoleBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      setError("Configuración incompleta.");
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(collection(db, "idealBuilds"), (snapshot) => {
      try {
        const builds = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as IdealRoleBuild[];
        
        setIdealBuilds(builds);
        setError(null);
      } catch (err) {
        setError("Error al cargar Builds Ideales.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setError("Error de conexión.");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveIdealBuild = async (build: IdealRoleBuild) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'idealBuilds', build.id), build);
      toast({ title: "Build Ideal guardada", description: `${build.position} - ${build.role}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar Build Ideal" });
    }
  };

  const deleteIdealBuild = async (id: string) => {
    if (!db) return;
    try { 
      await deleteDoc(doc(db, 'idealBuilds', id)); 
      toast({ title: "Build Eliminada" }); 
    } catch (err) { 
      toast({ variant: "destructive", title: "Error al eliminar" }); 
    }
  };

  return { idealBuilds, loading, error, saveIdealBuild, deleteIdealBuild };
}
