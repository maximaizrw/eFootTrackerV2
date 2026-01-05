
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, arrayUnion, query, orderBy, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { FormationStats, MatchResult, AddMatchFormValues, AddFormationFormValues, EditFormationFormValues } from '@/lib/types';

const defaultSlots = Array(11).fill({ position: 'DC', styles: [] });

export function useFormations() {
  const [formations, setFormations] = useState<FormationStats[]>([]);
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

    const q = query(collection(db, "formations"), orderBy("name", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      try {
        const formationsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure slots exist and are properly formatted
              slots: (data.slots && data.slots.length === 11) 
                ? data.slots.map((s: any) => ({ ...s, styles: s.styles || [] })) 
                : defaultSlots,
            } as FormationStats;
        });
        setFormations(formationsData);
        setError(null);
      } catch (err) {
        console.error("Error processing formations snapshot: ", err);
        setError("No se pudieron procesar los datos de las formaciones.");
        toast({
          variant: "destructive",
          title: "Error de Datos",
          description: "No se pudieron procesar los datos de las formaciones.",
        });
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching formations from Firestore: ", err);
      setError("No se pudo conectar a la base de datos para leer formaciones.");
      setFormations([]);
      setLoading(false);
      toast({
          variant: "destructive",
          title: "Error de Conexión",
          description: "No se pudo conectar a la base de datos para leer formaciones."
      });
    });

    return () => unsub();
  }, []);
  
  const addFormation = async (values: AddFormationFormValues) => {
    if (!db) return;
    try {
        const newFormation = {
            name: values.name,
            creator: values.creator || '',
            playStyle: values.playStyle,
            slots: values.slots,
            matches: [],
            imageUrl: values.imageUrl || '',
            secondaryImageUrl: values.secondaryImageUrl || '',
            sourceUrl: values.sourceUrl || '',
        };
        await addDoc(collection(db, 'formations'), newFormation);
        toast({ title: "Formación Añadida", description: `La formación "${values.name}" se ha guardado.` });
    } catch (error) {
        console.error("Error adding formation: ", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: `No se pudo guardar la formación.`,
        });
    }
  };
  
  const editFormation = async (values: EditFormationFormValues) => {
    if (!db) return;
    try {
      const formationRef = doc(db, 'formations', values.id);
      await updateDoc(formationRef, {
        name: values.name,
        creator: values.creator || '',
        playStyle: values.playStyle,
        slots: values.slots,
        imageUrl: values.imageUrl || '',
        secondaryImageUrl: values.secondaryImageUrl || '',
        sourceUrl: values.sourceUrl || '',
      });
      toast({ title: "Formación Actualizada", description: `La formación "${values.name}" ha sido actualizada.` });
    } catch (error) {
      console.error("Error updating formation: ", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: `No se pudo actualizar la formación.`,
      });
    }
  };


  const addMatchResult = async (values: AddMatchFormValues) => {
    if(!db) return;
    try {
      const formationRef = doc(db, 'formations', values.formationId);
      const newResult: MatchResult = {
        id: uuidv4(),
        goalsFor: values.goalsFor,
        goalsAgainst: values.goalsAgainst,
        shotsOnGoal: values.shotsOnGoal || 0,
        date: new Date().toISOString(),
      };
      await updateDoc(formationRef, {
        matches: arrayUnion(newResult)
      });
      toast({ title: "Resultado Añadido", description: `Marcador ${values.goalsFor} - ${values.goalsAgainst} guardado.` });
    } catch (error) {
      console.error("Error adding match result:", error);
      toast({
        variant: "destructive",
        title: "Error al Registrar",
        description: "No se pudo guardar el resultado del partido.",
      });
    }
  };

  const deleteFormation = async (formation: FormationStats) => {
    if(!db) return;
    try {
      await deleteDoc(doc(db, 'formations', formation.id));
      toast({ title: "Formación Eliminada", description: "La formación y sus estadísticas han sido eliminadas." });
    } catch (error) {
      console.error("Error deleting formation:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar la formación.",
      });
    }
  };

  const deleteMatchResult = async (formationId: string, matchId: string) => {
    if (!db) return;
    const formationRef = doc(db, 'formations', formationId);
    try {
        const formationSnap = await getDoc(formationRef);
        if (formationSnap.exists()) {
            const formationData = formationSnap.data() as FormationStats;
            const updatedMatches = formationData.matches.filter(match => match.id !== matchId);
            await updateDoc(formationRef, { matches: updatedMatches });
            toast({ title: "Resultado Eliminado", description: "El resultado del partido ha sido eliminado." });
        }
    } catch (error) {
        console.error("Error deleting match result: ", error);
        toast({
            variant: "destructive",
            title: "Error al Eliminar",
            description: "No se pudo eliminar el resultado del partido.",
        });
    }
  };

  const downloadBackup = async () => {
    if (!db) return null;
    try {
      const formationsCollection = collection(db, 'formations');
      const formationSnapshot = await getDocs(formationsCollection);
      return formationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching formations for backup: ", error);
      return null;
    }
  };

  return { formations, loading, error, addFormation, editFormation, addMatchResult, deleteFormation, deleteMatchResult, downloadBackup };
}
