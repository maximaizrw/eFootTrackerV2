
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand } from "lucide-react";

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
    { key: 'lowerBodyStrength', label: 'Fuerza del tren inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof GoalkeeperBuild; label: string, icon: React.ElementType }[] = [
    { key: 'gk1', label: 'Portero 1', icon: Hand },
    { key: 'gk2', label: 'Portero 2', icon: Hand },
    { key: 'gk3', label: 'Portero 3', icon: Hand },
];


export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild }: PlayerDetailDialogProps) {
  const [build, setBuild] = React.useState<PlayerBuild>({ manualAffinity: 0 });
  
  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';

  const buildForPosition = position && card?.buildsByPosition?.[position];
  const updatedAt = buildForPosition?.updatedAt;

  React.useEffect(() => {
    if (open && flatPlayer && position) {
      const initialBuild = card?.buildsByPosition?.[position] || { manualAffinity: 0 };
      setBuild(initialBuild);
    } else {
      setBuild({ manualAffinity: 0 });
    }
  }, [open, flatPlayer, card, position]);

  const handleSave = () => {
    if (player && card && position) {
      onSavePlayerBuild(player.id, card.id, position, build);
      onOpenChange(false);
    }
  };
  
  const formattedDate = updatedAt 
    ? format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) 
    : 'N/A';

  const handleAffinityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? undefined : parseInt(value, 10);
    
    if (numValue === undefined) {
       setBuild(prev => ({...prev, manualAffinity: undefined}));
    } else if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
       setBuild(prev => ({...prev, manualAffinity: numValue}));
    }
  };

  const handleSliderChange = (category: keyof OutfieldBuild | keyof GoalkeeperBuild, value: number) => {
    setBuild(prev => ({ ...prev, [category]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Build para {player?.name} ({card?.name}) en <span className="text-primary">{position}</span></DialogTitle>
          <DialogDescription>
            Define los puntos de progresión y la afinidad para esta posición. Últ. act: <span className="font-semibold text-foreground">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="manualAffinity">Afinidad Manual (0-100)</Label>
                    <Input
                    id="manualAffinity"
                    type="number"
                    value={build.manualAffinity ?? ''}
                    onChange={handleAffinityChange}
                    placeholder="Ej: 85"
                    min="0"
                    max="100"
                    />
                </div>
                
                <p className="font-medium text-sm text-muted-foreground pt-2">Puntos de Progresión (0-20)</p>

                {isGoalkeeper ? (
                    goalkeeperCategories.map(({key, label, icon: Icon}) => (
                        <div key={key} className="space-y-2">
                            <Label className="flex items-center gap-2">{<Icon className="w-4 h-4" />} {label}: <span className="font-bold text-primary">{(build as GoalkeeperBuild)[key] || 0}</span></Label>
                            <Slider 
                                value={[(build as GoalkeeperBuild)[key] || 0]}
                                onValueChange={(v) => handleSliderChange(key, v[0])}
                                max={20}
                                step={1}
                            />
                        </div>
                    ))
                ) : (
                     outfieldCategories.map(({key, label, icon: Icon}) => (
                        <div key={key} className="space-y-2">
                            <Label className="flex items-center gap-2">{<Icon className="w-4 h-4" />} {label}: <span className="font-bold text-primary">{(build as OutfieldBuild)[key] || 0}</span></Label>
                            <Slider 
                                value={[(build as OutfieldBuild)[key] || 0]}
                                onValueChange={(v) => handleSliderChange(key, v[0])}
                                max={20}
                                step={1}
                            />
                        </div>
                    ))
                )}

            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
          <Button onClick={handleSave}>Guardar Build de {position}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
