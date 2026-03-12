'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FlaskConical, Calculator, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateRoleRating, resolveIdealBuild, getOverallColorClass } from '@/lib/utils';
import { positions, playerSkillsList, getAvailableStylesForPosition } from '@/lib/types';
import type { PlayerAttributeStats, PlayerSkill, Position, PlayerStyle, IdealRoleBuild } from '@/lib/types';

const statGroups: { label: string; value: string; keys: (keyof PlayerAttributeStats)[] }[] = [
  {
    label: 'Ofensivo',
    value: 'ofensivo',
    keys: ['offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl'],
  },
  {
    label: 'Defensivo',
    value: 'defensivo',
    keys: ['defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression'],
  },
  {
    label: 'Físico',
    value: 'fisico',
    keys: ['speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'],
  },
  {
    label: 'Arquero',
    value: 'arquero',
    keys: ['goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'],
  },
];

const statLabels: Record<keyof PlayerAttributeStats, string> = {
  offensiveAwareness: 'Actitud Ofensiva',
  ballControl: 'Control de Balón',
  dribbling: 'Regate',
  tightPossession: 'Posesión',
  lowPass: 'Pase Raso',
  loftedPass: 'Pase Bombeado',
  finishing: 'Finalización',
  heading: 'Cabeceo',
  placeKicking: 'Balón Parado',
  curl: 'Efecto',
  defensiveAwareness: 'Actitud Defensiva',
  defensiveEngagement: 'Dedicación Def.',
  tackling: 'Entrada',
  aggression: 'Agresividad',
  goalkeeping: 'Actitud PT',
  gkCatching: 'Atajar PT',
  gkParrying: 'Despejar PT',
  gkReflexes: 'Reflejos PT',
  gkReach: 'Alcance PT',
  speed: 'Velocidad',
  acceleration: 'Aceleración',
  kickingPower: 'Potencia de Tiro',
  jump: 'Salto',
  physicalContact: 'Contacto Físico',
  balance: 'Equilibrio',
  stamina: 'Resistencia',
};

type PositionRoleEntry = { position: Position; role: PlayerStyle };
type ResultEntry = PositionRoleEntry & { roleRating: number; hasBuild: boolean };

interface PlayerTesterProps {
  idealBuilds: IdealRoleBuild[];
}

export function PlayerTester({ idealBuilds }: PlayerTesterProps) {
  const [stats, setStats] = useState<PlayerAttributeStats>({});
  const [selectedSkills, setSelectedSkills] = useState<Set<PlayerSkill>>(new Set());
  const [positionRoles, setPositionRoles] = useState<PositionRoleEntry[]>([]);
  const [results, setResults] = useState<ResultEntry[] | null>(null);

  const handleStatChange = (key: keyof PlayerAttributeStats, val: string) => {
    const num = parseInt(val, 10);
    setStats(prev => ({ ...prev, [key]: isNaN(num) ? undefined : Math.min(99, Math.max(1, num)) }));
  };

  const toggleSkill = (skill: PlayerSkill) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  };

  const togglePosition = (pos: Position) => {
    setPositionRoles(prev => {
      const exists = prev.find(e => e.position === pos);
      if (exists) return prev.filter(e => e.position !== pos);
      const availableRoles = getAvailableStylesForPosition(pos, false);
      const defaultRole = availableRoles[0] || ('Ninguno' as PlayerStyle);
      return [...prev, { position: pos, role: defaultRole }];
    });
  };

  const setRoleForPosition = (pos: Position, role: PlayerStyle) => {
    setPositionRoles(prev => prev.map(e => e.position === pos ? { ...e, role } : e));
  };

  const handleCalculate = () => {
    const skillsArr = Array.from(selectedSkills);
    const res: ResultEntry[] = positionRoles.map(({ position, role }) => {
      const idealBuild = resolveIdealBuild(position, role, idealBuilds);
      const rating = calculateRoleRating(stats, skillsArr, idealBuild);
      return { position, role, roleRating: rating, hasBuild: !!idealBuild };
    });
    res.sort((a, b) => b.roleRating - a.roleRating);
    setResults(res);
  };

  const selectedPositions = useMemo(() => new Set(positionRoles.map(e => e.position)), [positionRoles]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <FlaskConical className="h-5 w-5" />
            Probador de Jugadores
          </CardTitle>
          <CardDescription>
            Ingresá las estadísticas, habilidades, posiciones y rol de un jugador para calcular su Rating de Rol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* --- STATS --- */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Estadísticas</h3>
            <Accordion type="multiple" defaultValue={['ofensivo']} className="w-full">
              {statGroups.map(group => (
                <AccordionItem key={group.value} value={group.value}>
                  <AccordionTrigger className="text-sm font-medium px-1">{group.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                      {group.keys.map(key => (
                        <div key={key} className="flex flex-col gap-1">
                          <Label className="text-xs text-muted-foreground truncate">{statLabels[key]}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            placeholder="—"
                            value={stats[key] ?? ''}
                            onChange={e => handleStatChange(key, e.target.value)}
                            className="h-8 text-center text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* --- SKILLS --- */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Habilidades{' '}
              <span className="text-xs normal-case font-normal text-muted-foreground">
                ({selectedSkills.size} seleccionadas)
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2 border rounded-md p-3 bg-muted/20">
              {playerSkillsList.map(skill => (
                <div key={skill} className="flex items-center gap-2">
                  <Checkbox
                    id={`skill-${skill}`}
                    checked={selectedSkills.has(skill)}
                    onCheckedChange={() => toggleSkill(skill)}
                  />
                  <label
                    htmlFor={`skill-${skill}`}
                    className="text-xs cursor-pointer leading-tight select-none"
                  >
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* --- POSITIONS & ROLES --- */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Posiciones y Rol
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 mb-4">
              {positions.map(pos => (
                <button
                  key={pos}
                  onClick={() => togglePosition(pos)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-semibold transition-all',
                    selectedPositions.has(pos)
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 border-border'
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>

            {positionRoles.length > 0 ? (
              <div className="space-y-2">
                {positionRoles.map(({ position, role }) => {
                  const availableRoles = getAvailableStylesForPosition(position, false);
                  return (
                    <div key={position} className="flex items-center gap-3 rounded-md border p-2 bg-muted/10">
                      <Badge variant="outline" className="w-12 justify-center shrink-0 font-bold">
                        {position}
                      </Badge>
                      <Select value={role} onValueChange={val => setRoleForPosition(position, val as PlayerStyle)}>
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 border rounded-md">
                Seleccioná al menos una posición para configurar el rol.
              </p>
            )}
          </section>

          <Button
            onClick={handleCalculate}
            disabled={positionRoles.length === 0}
            className="w-full"
            size="lg"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Calcular Rating de Rol
          </Button>
        </CardContent>
      </Card>

      {/* --- RESULTS --- */}
      {results !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Resultados
            </CardTitle>
            <CardDescription>
              Rating de Rol calculado para cada combinación posición/rol, ordenado de mayor a menor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No hay posiciones/roles para mostrar.
              </p>
            ) : (
              <div className="space-y-2">
                {results.map(({ position, role, roleRating, hasBuild }) => (
                  <div
                    key={`${position}-${role}`}
                    className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="secondary" className="w-12 justify-center font-bold shrink-0">
                        {position}
                      </Badge>
                      <span className="text-sm font-medium truncate">{role}</span>
                      {!hasBuild && (
                        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                          Sin build ideal
                        </Badge>
                      )}
                    </div>
                    <div className={cn('text-2xl font-black tabular-nums ml-4 shrink-0', getOverallColorClass(roleRating))}>
                      {roleRating}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
