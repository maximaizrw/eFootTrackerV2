
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDocs } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { IdealBuild, Player, PlayerCard, Position } from '@/lib/types';
import { playerSkillsList } from '@/lib/types';
import { calculateProgressionStats, calculateAffinityWithBreakdown, normalizeStyleName, getIdealBuildForPlayer } from '@/lib/utils';

export function useIdealBuilds() {
  const [idealBuilds, setIdealBuilds] = useState<IdealBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validSkillsSet = useMemo(() => new Set(playerSkillsList), []);

  useEffect(() => {
    if (!db) { setError("Configuración incompleta."); setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "idealBuilds"), (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => {
            const buildData = doc.data();
            // Filter skills
            const filteredPrimary = (buildData.primarySkills || []).filter((s: string) => validSkillsSet.has(s as any));
            const filteredSecondary = (buildData.secondarySkills || []).filter((s: string) => validSkillsSet.has(s as any));

            return { 
                id: doc.id, 
                ...buildData,
                primarySkills: filteredPrimary,
                secondarySkills: filteredSecondary,
            } as IdealBuild;
        });
        data.sort((a, b) => a.position.localeCompare(b.position) || a.style.localeCompare(b.style) || (a.profileName || '').localeCompare(b.profileName || ''));
        setIdealBuilds(data);
        setError(null);
      } catch (err) { setError("Error al procesar builds."); } finally { setLoading(false); }
    }, (err) => { setError("Error de conexión."); setLoading(false); });
    return () => unsub();
  }, [validSkillsSet]);

  const saveIdealBuild = async (build: IdealBuild) => {
    if (!db) return;
    const profilePart = build.profileName ? `-${build.profileName.trim().replace(/\s+/g, '_')}` : '';
    const buildId = `Contraataque_largo-${build.position}-${build.style.replace(/\s+/g, '_')}${profilePart}`;
    try {
        const dataToSave = {
          playStyle: 'Contraataque largo', position: build.position, style: build.style,
          profileName: build.profileName || "", build: build.build,
          height: build.height || { min: 0, max: 0 }, weight: build.weight || { min: 0, max: 0 },
          primarySkills: build.primarySkills || [], secondarySkills: build.secondarySkills || []
        };
        await setDoc(doc(db, 'idealBuilds', buildId), dataToSave, { merge: true });
        toast({ title: "Build Guardada", description: `${build.position} - ${build.style}` });
        
        const playersSnap = await getDocs(collection(db, 'players'));
        for (const pDoc of playersSnap.docs) {
            const player = { id: pDoc.id, ...pDoc.data() } as Player;
            let updated = false;
            const newCards = player.cards.map(card => {
                if (normalizeStyleName(card.style) === normalizeStyleName(build.style)) {
                    ['buildsByPosition', 'averageBuildsByPosition'].forEach(field => {
                        const builds = (card as any)[field];
                        if (builds && builds[build.position]) {
                            const b = builds[build.position];
                            const final = isSpecialCard(card.name) ? card.attributeStats : calculateProgressionStats(card.attributeStats || {}, b, build.position === 'PT');
                            const { bestBuild } = getIdealBuildForPlayer(card.style, build.position as Position, [...idealBuilds, { ...dataToSave, id: buildId }], 'Contraataque largo', card.physicalAttributes?.height);
                            b.manualAffinity = calculateAffinityWithBreakdown(final || {}, bestBuild, card.physicalAttributes, card.skills).totalAffinityScore;
                            b.updatedAt = new Date().toISOString();
                            updated = true;
                        }
                    });
                }
                return card;
            });
            if (updated) await setDoc(doc(db, 'players', player.id), { ...player, cards: newCards });
        }
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." }); }
  };

  const deleteIdealBuild = async (id: string) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'idealBuilds', id)); toast({ title: "Eliminada" }); }
    catch (err) { toast({ variant: "destructive", title: "Error" }); }
  };

  return { idealBuilds, loading, error, saveIdealBuild, deleteIdealBuild };
}

function isSpecialCard(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('potw') || n.includes('pots') || n.includes('potm');
}
