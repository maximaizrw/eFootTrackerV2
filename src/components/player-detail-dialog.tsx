"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild, OutfieldBuild, GoalkeeperBuild, PlayerSkill, PlayerAttributeStats, PhysicalAttribute } from "@/lib/types";
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
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Dumbbell, StickyNote, Image as ImageIcon, SlidersHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { usePlayers } from "@/hooks/usePlayers";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { playerSkillsList } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  }) => void;
};

const outfieldCategories: { key: keyof OutfieldBuild; label: string, icon: React.ElementType }[] = [
    { key: 'shooting', label: 'Tiro', icon: Target },
    { key: 'passing', label: 'Pase', icon: Footprints },
    { key: 'dribbling', label: 'Regate', icon: Dribbble },
    { key: 'dexterity', label: 'Destreza', icon: Zap },
    { key: 'lowerBodyStrength', label: 'Fuerza inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof GoalkeeperBuild; label: string, icon: React.ElementType }[] = [
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

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSaveFullData }: PlayerDetailDialogProps) {
  const { positionNotes, savePositionNote } = usePlayers();
  const [build, setBuild] = React.useState<PlayerBuild>({});
  const [imageUrl, setImageUrl] = React.useState('');
  const [height, setHeight] = React.useState<number | ''>('');
  const [weight, setWeight] = React.useState<number | ''>('');
  const [skills, setSkills] = React.useState<PlayerSkill[]>([]);
  const [stats, setStats] = React.useState<PlayerAttributeStats>({});
  const [localNote, setLocalNote] = React.useState('');
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
      setLocalNote(positionNotes[position] || '');
    }
  }, [open, flatPlayer, card, position, positionNotes]);

  const handleSave = () => {
    if (player && card && position) {
      onSaveFullData(player.id, card.id, position, {
        build: { ...build, updatedAt: new Date().toISOString() },
        imageUrl,
        stats,
        physical: { height: height === '' ? undefined : Number(height), weight: weight === '' ? undefined : Number(weight) },
        skills,
      });
      savePositionNote(position, localNote);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl"><Dumbbell className="h-6 w-6 text-accent" /> Ficha Maestra de {player?.name}</DialogTitle>
            <DialogDescription>Edita todos los datos manuales de esta carta para la posición {position}. Los atributos son visuales y opcionales.</DialogDescription>
            </DialogHeader>
        </div>
        
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden border-t">
            <ScrollArea className="flex-grow p-6 h-full">
                <div className="space-y-8 pb-10">
                    {/* Sección de Imagen y Físico */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Datos Visuales de la Carta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>URL de Imagen (eFootballHub / ImgBB)</Label>
                                <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
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
                                <Button variant="outline" className="w-full justify-between h-auto min-h-10">
                                    <div className="flex gap-1 flex-wrap">
                                        {skills.length > 0 ? skills.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar habilidades...</span>}
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

                    {/* Entrenamiento (Progression) */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <Dumbbell className="h-4 w-4" /> Entrenamiento / Build ({position})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                                <div key={key} className="space-y-2">
                                    <Label className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {label}</span>
                                        <span className="font-bold text-primary">{(build as any)[key] || 0}</span>
                                    </Label>
                                    <Slider value={[(build as any)[key] || 0]} onValueChange={(v) => setBuild(p => ({...p, [key]: v[0]}))} max={16} step={1} />
                                </div>
                            ))}
                        </div>
                    </div>

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
                                        {cat.fields.map(f => (
                                            <div key={f.name} className="space-y-1">
                                                <Label className="text-[10px] truncate block">{f.label}</Label>
                                                <Input type="number" value={(stats as any)[f.name] ?? ''} onChange={(e) => handleStatChange(f.name, e.target.value)} className="h-8 text-xs" min={0} max={99} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Notas Globales (Panel Lateral Derecho) */}
            <div className="w-full md:w-80 border-l bg-muted/10 p-6 flex flex-col h-full shrink-0">
                <Label className="font-bold text-sm text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Notas Globales ({position})
                </Label>
                <Textarea 
                    placeholder={`Define aquí los requisitos para todos los jugadores en ${position}...`} 
                    className="flex-grow resize-none text-base border-primary/20 focus:border-primary"
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-4 italic leading-tight">
                    Estas notas son compartidas por posición. Cualquier cambio se aplicará a todas las cartas de tu lista que jueguen en este puesto.
                </p>
            </div>
        </div>

        <DialogFooter className="p-6 border-t bg-background">
          <Button onClick={handleSave} className="w-full md:w-auto px-10">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}