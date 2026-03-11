
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild, PlayerSkill, PlayerAttributeStats, PhysicalAttribute, Nationality, League } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Dumbbell, Image as ImageIcon, SlidersHorizontal, Check, ChevronsUpDown, Globe, Trophy } from "lucide-react";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { playerSkillsList, nationalities, leagues } from "@/lib/types";
import { cn, calculatePointsSpent, calculateFinalStats } from "@/lib/utils";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSaveFullData: (playerId: string, cardId: string, position: Position, data: {
    build: PlayerBuild;
    imageUrl?: string;
    stats: PlayerAttributeStats;
    physical: PhysicalAttribute;
    skills: PlayerSkill[];
    nationality?: Nationality;
    league?: League;
  }) => void;
};

const outfieldCategories: { key: keyof PlayerBuild; label: string, icon: React.ElementType }[] = [
    { key: 'shooting', label: 'Tiro', icon: Target },
    { key: 'passing', label: 'Pase', icon: Footprints },
    { key: 'dribbling', label: 'Regate', icon: Dribbble },
    { key: 'dexterity', label: 'Destreza', icon: Zap },
    { key: 'lowerBodyStrength', label: 'Fuerza inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof PlayerBuild; label: string, icon: React.ElementType }[] = [
    { key: 'gk1', label: 'Portero 1', icon: Hand },
    { key: 'gk2', label: 'Parada', icon: Hand },
    { key: 'gk3', label: 'Portero 3', icon: Hand },
];

const statFields: { category: string, fields: { name: keyof PlayerAttributeStats, label: string }[] }[] = [
    { category: 'Ataque', fields: [{ name: 'offensiveAwareness', label: 'Act. Ofensiva' }, { name: 'ballControl', label: 'Control' }, { name: 'dribbling', label: 'Regate' }, { name: 'tightPossession', label: 'Posesión' }, { name: 'lowPass', label: 'P. Raso' }, { name: 'loftedPass', label: 'P. Bombeado' }, { name: 'finishing', label: 'Finalización' }, { name: 'heading', label: 'Cabeceo' }, { name: 'placeKicking', label: 'B. Parado' }, { name: 'curl', label: 'Efecto' }] },
    { category: 'Defensa', fields: [{ name: 'defensiveAwareness', label: 'Act. Defensiva' }, { name: 'defensiveEngagement', label: 'Dedicación' }, { name: 'tackling', label: 'Entrada' }, { name: 'aggression', label: 'Agresividad' }] },
    { category: 'Atletismo', fields: [{ name: 'speed', label: 'Velocidad' }, { name: 'acceleration', label: 'Aceleración' }, { name: 'kickingPower', label: 'Potencia' }, { name: 'jump', label: 'Salto' }, { name: 'physicalContact', label: 'Físico' }, { name: 'balance', label: 'Equilibrio' }, { name: 'stamina', label: 'Resistencia' }] },
    { category: 'Portería', fields: [{ name: 'goalkeeping', label: 'Act. Portero' }, { name: 'gkCatching', label: 'Atajar' }, { name: 'gkParrying', label: 'Parada' }, { name: 'gkReflexes', label: 'Reflejos' }, { name: 'gkReach', label: 'Cobertura' }] }
];

const EMPTY_IDEAL_BUILDS: any[] = [];

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSaveFullData }: PlayerDetailDialogProps) {
  const [build, setBuild] = React.useState<PlayerBuild>({});
  const [imageUrl, setImageUrl] = React.useState('');
  const [height, setHeight] = React.useState<number | ''>('');
  const [weight, setWeight] = React.useState<number | ''>('');
  const [skills, setSkills] = React.useState<PlayerSkill[]>([]);
  const [stats, setStats] = React.useState<PlayerAttributeStats>({});
  const [nationality, setNationality] = React.useState<Nationality>('Sin Nacionalidad');
  const [league, setLeague] = React.useState<League>('Sin Liga');
  const [skillsPopoverOpen, setSkillsPopoverOpen] = React.useState(false);

  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';

  React.useEffect(() => {
    if (open && flatPlayer && position && card) {
      setBuild(card.buildsByPosition?.[position] || {});
      setImageUrl(card.imageUrl || '');
      setHeight(card.physicalAttributes?.height ?? '');
      setWeight(card.physicalAttributes?.weight ?? '');
      setSkills(card.skills || []);
      setStats(card.attributeStats || {});
      setNationality(player?.nationality || 'Sin Nacionalidad');
      setLeague(card.league || 'Sin Liga');
    }
  }, [open, flatPlayer, card, position, player]);

  const handleSave = () => {
    if (player && card && position) {
      onSaveFullData(player.id, card.id, position, {
        build: { ...build, updatedAt: new Date().toISOString() },
        imageUrl,
        stats,
        physical: { height: height === '' ? undefined : Number(height), weight: weight === '' ? undefined : Number(weight) },
        skills,
        nationality,
        league,
      });
      onOpenChange(false);
    }
  };

  const handleSkillToggle = (skillToToggle: string) => {
    setSkills(prev => prev.includes(skillToToggle as PlayerSkill) 
        ? prev.filter(s => s !== skillToToggle) 
        : [...prev, skillToToggle as PlayerSkill]
    );
  };

  const handleStatChange = (key: keyof PlayerAttributeStats, value: string) => {
    setStats(prev => ({ ...prev, [key]: value === '' ? undefined : Number(value) }));
  };

  const isUntrainable = (card?.name || '').toUpperCase().startsWith("POT");
  const idealBuild = flatPlayer?.idealBuild;
  const maxPoints = card?.availableTrainingPoints || 0;
  const spentPoints = calculatePointsSpent(build);
  const calculatedFinalStats = calculateFinalStats(stats, build);

  const handleBuildChange = (key: keyof PlayerBuild, newValue: number) => {
    if (maxPoints > 0) {
      const currentLevel = (build as any)[key] || 0;
      
      // If we are reducing the level, always allow it
      if (newValue <= currentLevel) {
        setBuild(p => ({ ...p, [key]: newValue }));
        return;
      }

      // If increasing the level, check if we exceed max points
      let allowedValue = newValue;
      while (allowedValue > currentLevel) {
        const testBuild = { ...build, [key]: allowedValue };
        const testCost = calculatePointsSpent(testBuild);
        if (testCost <= maxPoints) {
           break; // Found the highest possible level that fits the budget
        }
        allowedValue--;
      }

      setBuild(p => ({ ...p, [key]: allowedValue }));
    } else {
      // If no maxPoints limit, allow any change
      setBuild(p => ({ ...p, [key]: newValue }));
    }
  };

  const missingStats: { label: string, diff: number }[] = [];
  const missingSkills: string[] = [];

  if (!idealBuild) {
    // We can't compare without an ideal build
  } else {
    Object.entries(idealBuild.targetStats || {}).forEach(([key, targetValue]) => {
      if (targetValue !== undefined && typeof targetValue === 'number') {
        let label = key;
        for (const cat of statFields) {
          const field = cat.fields.find(f => f.name === key);
          if (field) {
            label = field.label;
            break;
          }
        }
        
        const currentVal = (calculatedFinalStats as any)[key] || 0;
        const diff = targetValue - currentVal;
        if (diff > 0) {
          missingStats.push({ label, diff });
        }
      }
    });

    (idealBuild.targetSkills || []).forEach(reqSkill => {
      if (!skills.includes(reqSkill)) {
        missingSkills.push(reqSkill);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
                <Dumbbell className="h-6 w-6 text-accent" /> Ficha Maestra de {player?.name}
                {flatPlayer?.overall !== undefined && (
                  <Badge variant="outline" className="ml-2 font-mono">
                    Overall: <span className="text-primary ml-1">{flatPlayer.overall.toFixed(1)}</span>
                  </Badge>
                )}
                {flatPlayer?.roleRating !== undefined && (
                  <Badge variant="outline" className="font-mono">
                    Rol: <span className="text-primary ml-1">{flatPlayer.roleRating.toFixed(0)}</span>
                  </Badge>
                )}
            </DialogTitle>
            <DialogDescription>Edita todos los datos manuales de esta carta para la posición {position}. Los atributos son visuales y opcionales.</DialogDescription>
            </DialogHeader>
        </div>
        
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden border-t">
            <ScrollArea className="flex-grow p-6 h-full">
                <div className="space-y-8 pb-10">
                    {/* Sección de Metadatos: Imagen, Liga, País y Físico */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Datos de Identidad y Carta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>URL de Imagen (eFootballHub / ImgBB)</Label>
                                    <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> País</Label>
                                        <Select value={nationality} onValueChange={(v) => setNationality(v as Nationality)}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Liga</Label>
                                        <Select value={league} onValueChange={(v) => setLeague(v as League)}>
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leagues.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 items-end pb-1">
                                <div className="space-y-2">
                                    <Label>Altura (cm)</Label>
                                    <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Habilidades */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <Check className="h-4 w-4" /> Habilidades del Jugador
                        </h3>
                        <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-auto min-h-10 text-left">
                                    <div className="flex gap-1 flex-wrap">
                                        {skills.length > 0 ? skills.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>) : <span className="text-muted-foreground text-xs font-normal">Seleccionar habilidades...</span>}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar habilidad..." />
                                    <CommandList>
                                        <CommandEmpty>No encontrada.</CommandEmpty>
                                        {playerSkillsList.map(s => (
                                            <CommandItem key={s} value={s} onSelect={() => handleSkillToggle(s)}>
                                                <Check className={cn("mr-2 h-4 w-4", skills.includes(s) ? "opacity-100" : "opacity-0")} />{s}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Entrenamiento (Progression) - Oculto para POT */}
                    {!isUntrainable && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                <Dumbbell className="h-4 w-4" /> Entrenamiento / Build ({position})
                                {(maxPoints !== undefined) && (
                                   <Badge variant="outline" className={cn("ml-auto font-mono", maxPoints > 0 && spentPoints > maxPoints ? "bg-destructive/10 text-destructive border-destructive" : "bg-muted/50")}>
                                      Puntos: {maxPoints > 0 ? `${maxPoints - spentPoints}/${maxPoints}` : spentPoints}
                                   </Badge>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                                    <div key={String(key)} className="space-y-2">
                                        <Label className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {label}</span>
                                            <span className="font-bold text-primary">{(build as any)[key] || 0}</span>
                                        </Label>
                                        <Slider value={[(build as any)[key] || 0]} onValueChange={(v) => handleBuildChange(key, v[0])} max={16} step={1} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Estadísticas Detalladas */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" /> Atributos Técnicos (Stats)
                        </h3>
                        <div className="space-y-6">
                            {statFields.map(cat => (
                                <div key={cat.category} className="space-y-2">
                                    <Label className="text-[10px] font-black opacity-50 uppercase">{cat.category}</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {cat.fields.map(f => {
                                            const baseVal = (stats as any)[f.name] || 0;
                                            const finalVal = (calculatedFinalStats as any)[f.name] || 0;
                                            const hasBump = finalVal > baseVal;
                                            return (
                                              <div key={f.name} className="space-y-1">
                                                  <Label className="text-[10px] truncate block flex justify-between">
                                                    <span>{f.label}</span>
                                                    {hasBump && <span className="text-green-500 font-bold ml-1">+{finalVal - baseVal}</span>}
                                                  </Label>
                                                  <div className="relative">
                                                      <Input type="number" value={(stats as any)[f.name] ?? ''} onChange={(e) => handleStatChange(f.name, e.target.value)} className="h-8 text-xs pr-8" min={0} max={99} />
                                                      {hasBump && (
                                                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-xs font-bold text-green-500">
                                                              {finalVal}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progresión Faltante (Comparativa Ideal) */}
                    {idealBuild && (
                        <div className="space-y-4 pt-4 border-t border-primary/10">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                <Target className="h-4 w-4" /> Progresión Faltante (Build Ideal: {idealBuild.role})
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black opacity-50 uppercase">Estadísticas Faltantes para Meta</Label>
                                    {missingStats.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {missingStats.map(s => (
                                                <Badge key={s.label} variant="outline" className="text-xs font-mono bg-destructive/10 text-destructive border-destructive/20">
                                                    +{s.diff} {s.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-green-500/10 rounded border border-green-500/20 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
                                            <Check className="h-4 w-4" /> Cumple con todas las estadísticas de la build ideal.
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black opacity-50 uppercase">Habilidades Faltantes para Meta</Label>
                                    {missingSkills.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {missingSkills.map(s => (
                                                <Badge key={s} variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                    +{s}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-green-500/10 rounded border border-green-500/20 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
                                            <Check className="h-4 w-4" /> Tiene todas las habilidades clave para este rol.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="p-6 border-t bg-background">
          <Button onClick={handleSave} className="w-full md:w-auto px-10">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
