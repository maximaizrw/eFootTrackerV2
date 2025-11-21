
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuilds, Position } from '@/lib/types';
import { positions, getAvailableStylesForPosition, positionGroups } from '@/lib/types';
import { getPositionGroup } from '@/lib/utils';


const generateInitialIdealBuilds = (): IdealBuilds => {
  const initialBuilds = {} as IdealBuilds;
  for (const pos of positions) {
    initialBuilds[pos] = {};
    const availableStyles = getAvailableStylesForPosition(pos, true);
    for (const style of availableStyles) {
      initialBuilds[pos][style] = {};
    }
  }
  return initialBuilds;
};

export function useIdealBuilds() {
  const [idealBuilds, setIdealBuilds] = useState<IdealBuilds>(generateInitialIdealBuilds());
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
        const emptyShell = generateInitialIdealBuilds();
        if (docSnap.exists()) {
          const dataFromDb = docSnap.data() as Partial<IdealBuilds>;
          // Deep merge to ensure all positions and styles are present
           for (const pos of positions) {
            if (dataFromDb[pos]) {
              for (const style of getAvailableStylesForPosition(pos, true)) {
                if (dataFromDb[pos]![style]) {
                  emptyShell[pos][style] = {
                    ...emptyShell[pos][style],
                    ...dataFromDb[pos]![style],
                  };
                }
              }
            }
          }
           setIdealBuilds(emptyShell);
        } else {
          // If document doesn't exist, we use the empty shell
          setIdealBuilds(emptyShell);
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

  const saveIdealBuildsForPosition = async (position: Position, buildsForPosition: IdealBuilds[Position]) => {
    if (!db) {
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se puede conectar a la base de datos." });
        return;
    }
    try {
      const docRef = doc(db, 'idealBuilds', 'user_default');
      
      const positionGroup = getPositionGroup(position);
      const representativePosition = positionGroups[positionGroup][0];

      // We only save under the representative position for the entire group.
      const dataToUpdate = {
        [representativePosition]: buildsForPosition
      };
      
      await setDoc(docRef, dataToUpdate, { merge: true });
      
      toast({
        title: "Builds Ideales Guardadas",
        description: `Las configuraciones para ${positionGroup} se han guardado.`,
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
