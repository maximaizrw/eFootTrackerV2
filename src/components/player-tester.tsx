'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Calculator, Trophy, ClipboardPaste, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateRoleRating, resolveIdealBuild, getOverallColorClass } from '@/lib/utils';
import { positions, playerSkillsList, getAvailableStylesForPosition } from '@/lib/types';
import type { PlayerAttributeStats, PlayerSkill, Position, PlayerStyle, IdealRoleBuild } from '@/lib/types';

// ── Stat name ➜ key mapping (handles eFootball english stat names) ───────────
const statNameToKey: Record<string, keyof PlayerAttributeStats> = {
  // Offensive
  'offensive awareness': 'offensiveAwareness',
  'ball control': 'ballControl',
  'dribbling': 'dribbling',
  'tight possession': 'tightPossession',
  'low pass': 'lowPass',
  'lofted pass': 'loftedPass',
  'finishing': 'finishing',
  'heading': 'heading',
  'place kicking': 'placeKicking',
  'curl': 'curl',
  // Defensive
  'defensive awareness': 'defensiveAwareness',
  'defensive engagement': 'defensiveEngagement',
  'tackling': 'tackling',
  'aggression': 'aggression',
  // GK
  'goalkeeping': 'goalkeeping',
  'gk catching': 'gkCatching',
  'gk parrying': 'gkParrying',
  'gk reflexes': 'gkReflexes',
  'gk reach': 'gkReach',
  // Physical
  'speed': 'speed',
  'acceleration': 'acceleration',
  'kicking power': 'kickingPower',
  'jump': 'jump',
  'physical contact': 'physicalContact',
  'balance': 'balance',
  'stamina': 'stamina',
};

function parseStatsText(text: string): { stats: PlayerAttributeStats; count: number } {
  const stats: PlayerAttributeStats = {};
  let count = 0;
  const lines = text.split('\n');
  for (const line of lines) {
    // A valid stat line has at least one tab + a number at the end
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Split by one or more tabs; last segment should be the number
    const parts = trimmed.split(/\t+/);
    if (parts.length < 2) continue;
    const numStr = parts[parts.length - 1].trim();
    const num = parseInt(numStr, 10);
    if (isNaN(num)) continue;
    const statName = parts.slice(0, parts.length - 1).join(' ').trim().toLowerCase();
    const key = statNameToKey[statName];
    if (key) {
      (stats as Record<string, number>)[key] = Math.min(99, Math.max(1, num));
      count++;
    }
  }
  return { stats, count };
}

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
  const [pasteText, setPasteText] = useState('');
  const [stats, setStats] = useState<PlayerAttributeStats>({});
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<PlayerSkill>>(new Set());
  const [positionRoles, setPositionRoles] = useState<PositionRoleEntry[]>([]);
  const [results, setResults] = useState<ResultEntry[] | null>(null);

  const handlePaste = () => {
    const { stats: parsed, count } = parseStatsText(pasteText);
    setStats(parsed);
    setParsedCount(count);
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
      const availableRoles = getAvailableStylesForPosition(pos, true); // always include Ninguno
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

  // Show parsed stats as a summary
  const statSummaryEntries = Object.entries(stats) as [keyof PlayerAttributeStats, number][];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <FlaskConical className="h-5 w-5" />
            Probador de Jugadores
          </CardTitle>
          <CardDescription>
            Pegá las estadísticas del juego, elegí habilidades, posiciones y rol para calcular el Rating de Rol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* ── PASTE STATS ── */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Pegar Estadísticas
            </h3>
            <Textarea
              placeholder={`Pegá las stats del juego aquí. Ejemplo:\nOffensive Awareness\t\t70\nBall Control\t\t76\nDribbling\t\t76\n...`}
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setParsedCount(null); }}
              className="font-mono text-xs h-36 resize-none"
            />
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePaste}
                disabled={!pasteText.trim()}
                className="shrink-0"
              >
                <ClipboardPaste className="h-4 w-4 mr-2" />
                Importar Stats
              </Button>
              {parsedCount !== null && (
                <span className={cn(
                  'text-sm flex items-center gap-1',
                  parsedCount > 0 ? 'text-green-500' : 'text-destructive'
                )}>
                  <CheckCircle2 className="h-4 w-4" />
                  {parsedCount > 0
                    ? `${parsedCount} estadísticas importadas`
                    : 'No se reconoció ninguna estadística'}
                </span>
              )}
            </div>

            {/* Stat summary grid */}
            {statSummaryEntries.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {statSummaryEntries.map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between rounded border px-2 py-1 bg-muted/20 text-xs gap-1">
                    <span className="text-muted-foreground truncate">{statLabels[key]}</span>
                    <span className="font-bold tabular-nums shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── SKILLS ── */}
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

          {/* ── POSITIONS & ROLES ── */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Posiciones y Rol
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 mb-4">
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
                  // Always include Ninguno so secondary positions can be set to none
                  const availableRoles = getAvailableStylesForPosition(position, true);
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

      {/* ── RESULTS ── */}
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
