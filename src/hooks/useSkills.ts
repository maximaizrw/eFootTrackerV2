
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { Skill } from '@/lib/types';

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      setError("La configuración de Firebase no está completa.");
      setLoading(false);
      return;
    }

    const q = query(collection(db, "skills"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      try {
        const skillsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        } as Skill));
        setSkills(skillsData);
        setError(null);
      } catch (err) {
        console.error("Error processing skills snapshot: ", err);
        setError("No se pudieron procesar los datos de las habilidades.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching skills from Firestore: ", err);
      setError("No se pudo conectar a la base de datos para leer las habilidades.");
      setSkills([]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const addSkill = async (name: string) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'skills'), { name });
      toast({ title: "Habilidad Añadida", description: `"${name}" se ha guardado.` });
    } catch (error) {
      console.error("Error adding skill: ", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar la habilidad." });
    }
  };

  const updateSkill = async (id: string, newName: string) => {
    if (!db) return;
    try {
      const skillRef = doc(db, 'skills', id);
      await updateDoc(skillRef, { name: newName });
      toast({ title: "Habilidad Actualizada", description: "El nombre de la habilidad se ha actualizado." });
    } catch (error) {
      console.error("Error updating skill: ", error);
      toast({ variant: "destructive", title: "Error al Actualizar", description: "No se pudo actualizar la habilidad." });
    }
  };

  const deleteSkill = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'skills', id));
      toast({ title: "Habilidad Eliminada" });
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar la habilidad." });
    }
  };

  return { skills, loading, error, addSkill, updateSkill, deleteSkill };
}
