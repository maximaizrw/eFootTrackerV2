'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import type { Position, PlayerStyle, IdealRoleBuild, PlayerAttributeStats, PlayerSkill, PriorityItem } from '@/lib/types';
import { positions, getAvailableStylesForPosition, playerSkillsList } from '@/lib/types';
import { allStatsKeys, resolveIdealBuild } from '@/lib/utils';
import { useIdealBuilds } from '@/hooks/useIdealBuilds';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const statLabels: Record<keyof PlayerAttributeStats, string> = {
  offensiveAwareness: 'Actitud Ofensiva', ballControl: 'Control de Balón', dribbling: 'Drible', tightPossession: 'Posesión Estrecha',
  lowPass: 'Pase Raso', loftedPass: 'Pase Bombeado', finishing: 'Finalización', heading: 'Cabeceador',
  placeKicking: 'Balón Parado', curl: 'Efecto', defensiveAwareness: 'Actitud Defensiva', defensiveEngagement: 'Compromiso Def.',
  tackling: 'Entrada', aggression: 'Agresividad', goalkeeping: 'Cualidades PT', gkCatching: 'Atajar PT',
  gkParrying: 'Despejar PT', gkReflexes: 'Reflejos PT', gkReach: 'Alcance PT', speed: 'Velocidad',
  acceleration: 'Aceleración', kickingPower: 'Fuerza de Tiro', jump: 'Salto', physicalContact: 'Contacto Físico',
  balance: 'Equilibrio', stamina: 'Resistencia'
};

function SortableItem({ id, item, targetStats, onStatChange, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 mb-2 border rounded-md bg-card shadow-sm ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground p-1" type="button">
        <GripVertical className="h-5 w-5" />
      </button>
      
      <div className="flex-1 font-medium text-sm flex items-center gap-2">
        <span>{item.type === 'stat' ? statLabels[item.key as keyof PlayerAttributeStats] || item.key : item.key}</span>
        <span className="text-[10px] text-muted-foreground uppercase border px-1 rounded bg-muted/50">{item.type}</span>
      </div>

      {item.type === 'stat' && (
        <Input 
          type="number" 
          min="1" max="99" 
          className="w-16 text-center h-8 custom-number-input" 
          value={targetStats[item.key as keyof PlayerAttributeStats] || ''}
          onChange={(e) => onStatChange(item.key, e.target.value)}
          placeholder="N/A"
        />
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(item.id)}>
         <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function IdealBuildsManager() {
  const { idealBuilds, saveIdealBuild, deleteIdealBuild } = useIdealBuilds();
  const [selectedPos, setSelectedPos] = useState<Position>('DC');
  const [selectedRole, setSelectedRole] = useState<PlayerStyle>('Ninguno');
  
  const currentBuildId = `${selectedPos}-${selectedRole}`;
  const existingBuild = resolveIdealBuild(selectedPos, selectedRole, idealBuilds);

  const [targetStats, setTargetStats] = useState<PlayerAttributeStats>({});
  const [priorityList, setPriorityList] = useState<PriorityItem[]>([]);
  
  const [statToAdd, setStatToAdd] = useState<string>('');
  const [skillToAdd, setSkillToAdd] = useState<string>('');
  
  useEffect(() => {
    setSelectedRole('Ninguno');
  }, [selectedPos]);

  useEffect(() => {
    if (existingBuild) {
      setTargetStats(existingBuild.targetStats || {});
      
      // If it has a priority list, load it
      if (existingBuild.priorityList && existingBuild.priorityList.length > 0) {
        setPriorityList([...existingBuild.priorityList]);
      } else {
        // Fallback for older builds
        const legacyList: PriorityItem[] = [];
        if (existingBuild.targetStats) {
          Object.keys(existingBuild.targetStats).forEach(key => {
            legacyList.push({ id: `stat-${key}`, type: 'stat', key });
          });
        }
        if (existingBuild.targetSkills) {
          existingBuild.targetSkills.forEach(key => {
            legacyList.push({ id: `skill-${key}`, type: 'skill', key });
          });
        }
        setPriorityList(legacyList);
      }
    } else {
      setTargetStats({});
      setPriorityList([]);
    }
  }, [existingBuild, selectedPos, selectedRole]);

  const handleStatChange = (key: keyof PlayerAttributeStats, value: string) => {
    const num = parseInt(value, 10);
    setTargetStats(prev => ({
      ...prev,
      [key]: isNaN(num) ? undefined : num
    }));
  };

  const handleAddStat = () => {
    if (!statToAdd) return;
    if (priorityList.some(p => p.type === 'stat' && p.key === statToAdd)) {
       setStatToAdd('');
       return;
    }
    const newItem: PriorityItem = { id: `stat-${statToAdd}-${Date.now()}`, type: 'stat', key: statToAdd };
    setPriorityList(prev => [...prev, newItem]);
    setStatToAdd('');
  };

  const handleAddSkill = () => {
    if (!skillToAdd) return;
    if (priorityList.some(p => p.type === 'skill' && p.key === skillToAdd)) {
       setSkillToAdd('');
       return;
    }
    const newItem: PriorityItem = { id: `skill-${skillToAdd}-${Date.now()}`, type: 'skill', key: skillToAdd };
    setPriorityList(prev => [...prev, newItem]);
    setSkillToAdd('');
  };

  const handleRemoveItem = (id: string) => {
    setPriorityList(prev => prev.filter(item => item.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPriorityList((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    // Only save targetStats that are present in the priority list
    const cleanedTargetStats: PlayerAttributeStats = {};
    const targetSkills: PlayerSkill[] = [];
    
    priorityList.forEach(item => {
      if (item.type === 'stat') {
         const val = targetStats[item.key as keyof PlayerAttributeStats];
         if (val !== undefined) {
           cleanedTargetStats[item.key as keyof PlayerAttributeStats] = val;
         }
      } else if (item.type === 'skill') {
         targetSkills.push(item.key as PlayerSkill);
      }
    });

    const newBuild: IdealRoleBuild = {
      id: currentBuildId,
      position: selectedPos,
      role: selectedRole,
      targetStats: cleanedTargetStats,
      targetSkills,
      priorityList
    };
    saveIdealBuild(newBuild);
  };

  const availableRoles = getAvailableStylesForPosition(selectedPos, true);
  
  // Available stats to select (not already added)
  const availableStats = allStatsKeys.filter(key => !priorityList.some(p => p.type === 'stat' && p.key === key));
  const availableSkills = playerSkillsList.filter(key => !priorityList.some(p => p.type === 'skill' && p.key === key));

  return (
    <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>Gestor de Builds Ideales</CardTitle>
        <CardDescription>
          Configura y ordena los atributos y habilidades según su prioridad (1.º es el más importante).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Posición</label>
            <Select value={selectedPos} onValueChange={(v) => setSelectedPos(v as Position)}>
              <SelectTrigger><SelectValue placeholder="Posición" /></SelectTrigger>
              <SelectContent>
                {positions.filter(p => !['LD', 'MDD', 'EXD'].includes(p)).map(p => {
                  let label = p as string;
                  if (p === 'LI') label = 'LI / LD';
                  if (p === 'MDI') label = 'MDI / MDD';
                  if (p === 'EXI') label = 'EXI / EXD';
                  return <SelectItem key={p} value={p}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Rol / Estilo de Juego</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PlayerStyle)}>
              <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md p-4 bg-muted/20">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Añadir Atributo / Habilidad</h3>
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-1 flex gap-2">
                 <Select value={statToAdd} onValueChange={setStatToAdd}>
                     <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar Estadística..." /></SelectTrigger>
                     <SelectContent>
                         {availableStats.map(stat => (
                             <SelectItem key={stat} value={stat}>{statLabels[stat] || stat}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
                 <Button onClick={handleAddStat} disabled={!statToAdd} variant="secondary"><Plus className="h-4 w-4" /></Button>
             </div>
             <div className="flex-1 flex gap-2">
                 <Select value={skillToAdd} onValueChange={setSkillToAdd}>
                     <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar Habilidad..." /></SelectTrigger>
                     <SelectContent>
                         {availableSkills.map(skill => (
                             <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
                 <Button onClick={handleAddSkill} disabled={!skillToAdd} variant="secondary"><Plus className="h-4 w-4" /></Button>
             </div>
          </div>
        </div>

        <div>
           <div className="flex items-center justify-between mb-2">
               <h3 className="font-semibold text-lg">Lista de Prioridades</h3>
               <span className="text-xs text-muted-foreground">{priorityList.length} elementos</span>
           </div>
           
           <ScrollArea className="h-[400px] border rounded bg-card p-4">
               {priorityList.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
                       <GripVertical className="h-8 w-8 opacity-20" />
                       <p>No hay atributos ni habilidades.</p>
                       <p className="text-sm">Usa los selectores de arriba para añadir y luego arrástralos para ordenarlos.</p>
                   </div>
               ) : (
                   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                       <SortableContext items={priorityList.map(item => item.id)} strategy={verticalListSortingStrategy}>
                           {priorityList.map((item, index) => (
                               <div key={item.id} className="flex items-stretch gap-2">
                                  {/* Visual Indicator of Weight */}
                                  <div className="w-8 flex items-center justify-center text-xs font-bold text-muted-foreground/30 select-none">
                                     #{index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <SortableItem 
                                        id={item.id} 
                                        item={item} 
                                        targetStats={targetStats} 
                                        onStatChange={handleStatChange} 
                                        onRemove={handleRemoveItem} 
                                    />
                                  </div>
                               </div>
                           ))}
                       </SortableContext>
                   </DndContext>
               )}
           </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {existingBuild && (
            <Button variant="destructive" onClick={() => deleteIdealBuild(existingBuild.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar Build
            </Button>
          )}
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Build
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
