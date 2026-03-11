import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, X } from 'lucide-react';
import type { Position, PlayerStyle, IdealRoleBuild, PlayerAttributeStats, PlayerSkill } from '@/lib/types';
import { positions, getAvailableStylesForPosition, playerSkillsList } from '@/lib/types';
import { allStatsKeys } from '@/lib/utils';
import { useIdealBuilds } from '@/hooks/useIdealBuilds';
import { Checkbox } from './ui/checkbox';

const statLabels: Record<keyof PlayerAttributeStats, string> = {
  offensiveAwareness: 'Actitud Ofensiva', ballControl: 'Control de Balón', dribbling: 'Drible', tightPossession: 'Posesión Estrecha',
  lowPass: 'Pase Raso', loftedPass: 'Pase Bombeado', finishing: 'Finalización', heading: 'Cabeceador',
  placeKicking: 'Balón Parado', curl: 'Efecto', defensiveAwareness: 'Actitud Defensiva', defensiveEngagement: 'Compromiso Def.',
  tackling: 'Entrada', aggression: 'Agresividad', goalkeeping: 'Cualidades PT', gkCatching: 'Atajar PT',
  gkParrying: 'Despejar PT', gkReflexes: 'Reflejos PT', gkReach: 'Alcance PT', speed: 'Velocidad',
  acceleration: 'Aceleración', kickingPower: 'Fuerza de Tiro', jump: 'Salto', physicalContact: 'Contacto Físico',
  balance: 'Equilibrio', stamina: 'Resistencia'
};

export function IdealBuildsManager() {
  const { idealBuilds, saveIdealBuild, deleteIdealBuild } = useIdealBuilds();
  const [selectedPos, setSelectedPos] = useState<Position>('DC');
  const [selectedRole, setSelectedRole] = useState<PlayerStyle>('Ninguno');
  
  const currentBuildId = `${selectedPos}-${selectedRole}`;
  const existingBuild = idealBuilds.find(b => b.id === currentBuildId);

  const [targetStats, setTargetStats] = useState<PlayerAttributeStats>({});
  const [targetSkills, setTargetSkills] = useState<PlayerSkill[]>([]);
  
  useEffect(() => {
    setSelectedRole('Ninguno');
  }, [selectedPos]);

  useEffect(() => {
    if (existingBuild) {
      setTargetStats(existingBuild.targetStats || {});
      setTargetSkills(existingBuild.targetSkills || []);
    } else {
      setTargetStats({});
      setTargetSkills([]);
    }
  }, [existingBuild, selectedPos, selectedRole]);

  const handleStatChange = (key: keyof PlayerAttributeStats, value: string) => {
    const num = parseInt(value, 10);
    setTargetStats(prev => ({
      ...prev,
      [key]: isNaN(num) ? undefined : num
    }));
  };

  const toggleSkill = (skill: PlayerSkill) => {
    setTargetSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSave = () => {
    const newBuild: IdealRoleBuild = {
      id: currentBuildId,
      position: selectedPos,
      role: selectedRole,
      targetStats,
      targetSkills
    };
    saveIdealBuild(newBuild);
  };

  const availableRoles = getAvailableStylesForPosition(selectedPos, true);

  return (
    <Card className="w-full max-w-5xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>Gestor de Builds Ideales</CardTitle>
        <CardDescription>
          Configura los atributos y habilidades ideales para cada posición y estilo de juego. 
          Los jugadores serán evaluados contra estas métricas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Posición</label>
            <Select value={selectedPos} onValueChange={(v) => setSelectedPos(v as Position)}>
              <SelectTrigger><SelectValue placeholder="Posición" /></SelectTrigger>
              <SelectContent>
                {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Stats Config */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Estadísticas Objetivo (1-99)</h3>
            <ScrollArea className="h-[400px] pr-4 border rounded p-2">
              <div className="space-y-3">
                {allStatsKeys.map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{statLabels[key] || key}</span>
                    <Input 
                      type="number" 
                      min="1" max="99" 
                      className="w-20 text-center" 
                      value={targetStats[key] || ''}
                      onChange={(e) => handleStatChange(key, e.target.value)}
                      placeholder="N/A"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Skills Config */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Habilidades Requeridas</h3>
            <ScrollArea className="h-[400px] border rounded p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {playerSkillsList.map(skill => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`skill-${skill}`} 
                      checked={targetSkills.includes(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                    />
                    <label htmlFor={`skill-${skill}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {skill}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
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
