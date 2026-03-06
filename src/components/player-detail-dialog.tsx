"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild, OutfieldBuild, GoalkeeperBuild } from "@/lib/types";
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
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Dumbbell, StickyNote } from "lucide-react";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, position: Position, build: PlayerBuild) => void;
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

export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild }: PlayerDetailDialogProps) {
  const [build, setBuild] = React.useState<PlayerBuild>({});

  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';

  React.useEffect(() => {
    if (open && flatPlayer && position && card) {
      setBuild(card.buildsByPosition?.[position] || {});
    }
  }, [open, flatPlayer, card, position]);

  const handleSave = () => {
    if (player && card && position) {
      onSavePlayerBuild(player.id, card.id, position, { ...build, updatedAt: new Date().toISOString() });
      onOpenChange(false);
    }
  };

  const handleSliderChange = (category: string, value: number) => {
    setBuild(prev => ({ ...prev, [category]: value }));
  }

  const handleNotesChange = (notes: string) => {
    setBuild(prev => ({ ...prev, notes }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-accent" /> Entrenamiento de {player?.name} en {position}</DialogTitle>
          <DialogDescription>Asigna los puntos de entrenamiento y guarda anotaciones específicas para esta posición.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden mt-4">
            <ScrollArea className="pr-4">
                <div className="space-y-6">
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Dumbbell className="h-3 w-3" /> Distribución de Puntos</p>
                    {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                        <div key={key} className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {label}</span>
                                <span className="font-bold text-primary">{(build as any)[key] || 0}</span>
                            </Label>
                            <Slider value={[(build as any)[key] || 0]} onValueChange={(v) => handleSliderChange(key, v[0])} max={16} step={1} />
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="md:border-l md:pl-8 flex flex-col h-full">
                <Label className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Anotaciones de la Posición
                </Label>
                <Textarea 
                    placeholder="Escribe aquí los stats clave o notas de esta build (ej: Aceleración +88, Pase +90...)" 
                    className="flex-grow resize-none text-base"
                    value={build.notes || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-2 italic">Estas notas son específicas para {position}.</p>
            </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-4">
          <Button onClick={handleSave}>Guardar Entrenamiento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}