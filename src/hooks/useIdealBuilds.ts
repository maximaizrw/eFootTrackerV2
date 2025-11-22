
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { PlayerStyle, PlayerStatsBuild, DbIdealBuilds, PositionLabel } from '@/lib/types';


const generateInitialIdealBuilds = (): DbIdealBuilds => {
  return {};
};


export function useIdealBuilds() {
  const [idealBuilds, setIdealBuilds] = useState<DbIdealBuilds>(generateInitialIdealBuilds());
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

    const docRef = doc(db, 'idealBuilds', 'user_default');

    const unsub = onSnapshot(docRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
            const dataFromDb = docSnap.data() as DbIdealBuilds;
            setIdealBuilds(dataFromDb);
        } else {
            setIdealBuilds(generateInitialIdealBuilds());
        }
        setError(null);
      } catch (err) {
        console.error("Error processing ideal builds snapshot: ", err);
        setError("No se pudieron procesar los datos de las builds ideales.");
        toast({
          variant: "destructive",
          title: "Error de Datos",
          description: "No se pudieron procesar los datos de las builds ideales.",
        });
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching ideal builds from Firestore: ", err);
      setError("No se pudo conectar a la base de datos para leer las builds ideales.");
      setIdealBuilds(generateInitialIdealBuilds());
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "No se pudo conectar a la base de datos para leer las builds ideales."
      });
    });

    return () => unsub();
  }, [toast]);

  const saveIdealBuildsForPosition = async (positionLabel: PositionLabel, buildsForPosition: { [key in PlayerStyle]?: PlayerStatsBuild }) => {
    if (!db) {
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se puede conectar a la base de datos." });
        return;
    }
    try {
      const docRef = doc(db, 'idealBuilds', 'user_default');
      
      const dataToUpdate = {
        [positionLabel]: buildsForPosition
      };
      
      await setDoc(docRef, dataToUpdate, { merge: true });
      
      toast({
        title: "Builds Ideales Guardadas",
        description: `Las configuraciones para ${positionLabel} se han guardado.`,
      });
    } catch (error) {
      console.error("Error saving ideal builds: ", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudieron guardar las builds ideales en la base de datos.",
      });
    }
  };

  return { idealBuilds, loading, error, saveIdealBuildsForPosition };
}
