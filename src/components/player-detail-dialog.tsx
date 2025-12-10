
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild, OutfieldBuild, GoalkeeperBuild, PlayerAttributeStats } from "@/lib/types";
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
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, SeparatorHorizontal } from "lucide-react";
import { calculateProgressionStats } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Info } from 'lucide-react';


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
  const [finalStats, setFinalStats] = React.useState<PlayerAttributeStats>({});
  
  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';
  const isPotw = card?.name.toLowerCase().includes('potw');

  const baseStats = React.useMemo(() => card?.attributeStats || {}, [card?.attributeStats]);
  
  const buildForPosition = position && card?.buildsByPosition?.[position];
  const updatedAt = buildForPosition?.updatedAt;

  React.useEffect(() => {
    if (open && flatPlayer && position) {
      const initialBuild = card?.buildsByPosition?.[position] || { manualAffinity: 0 };
      setBuild(initialBuild);
    } else {
      setBuild({ manualAffinity: 0 });
      setFinalStats({});
    }
  }, [open, flatPlayer, card, position]);

  React.useEffect(() => {
    if(open && !isPotw){
        const newFinalStats = calculateProgressionStats(baseStats, build);
        setFinalStats(newFinalStats);
    }
  }, [build, baseStats, open, isPotw]);

  const handleSave = () => {
    if (player && card && position && !isPotw) {
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
    } else if (!isNaN(numValue) && numValue >= -100 && numValue <= 100) {
       setBuild(prev => ({...prev, manualAffinity: numValue}));
    }
  };

  const handleSliderChange = (category: keyof OutfieldBuild | keyof GoalkeeperBuild, value: number) => {
    setBuild(prev => ({ ...prev, [category]: value }));
  }

  const StatDisplay = ({ label, value, baseValueProp }: { label: string; value?: number, baseValueProp?: keyof PlayerAttributeStats }) => {
    const baseValue = baseValueProp ? baseStats[baseValueProp] : undefined;
    const hasIncreased = value !== undefined && baseValue !== undefined && value > baseValue;

    if (value === undefined || value === 0) return null;
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(
                "font-bold",
                hasIncreased && "text-primary",
                !hasIncreased && value >= 90 && "text-sky-400",
                !hasIncreased && value >= 85 && value < 90 && "text-green-400",
                !hasIncreased && value >= 80 && value < 85 && "text-yellow-400",
            )}>{value}</span>
        </div>
    );
  };


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
                    <Label htmlFor="manualAffinity">Afinidad Manual (-100 a 100)</Label>
                    <Input
                    id="manualAffinity"
                    type="number"
                    value={build.manualAffinity ?? ''}
                    onChange={handleAffinityChange}
                    placeholder="Ej: 85"
                    min="-100"
                    max="100"
                    />
                </div>
                
                {isPotw ? (
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Carta Especial</AlertTitle>
                        <AlertDescription>
                            Las cartas POTW (Player of the Week) y otras cartas especiales no tienen puntos de progresión. Sus estadísticas son fijas.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <p className="font-medium text-sm text-muted-foreground pt-2">Puntos de Progresión (0-20)</p>

                        {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                            <div key={key} className="space-y-2">
                                <Label className="flex items-center gap-2">{<Icon className="w-4 h-4" />} {label}: <span className="font-bold text-primary">{(build as any)[key] || 0}</span></Label>
                                <Slider 
                                    value={[(build as any)[key] || 0]}
                                    onValueChange={(v) => handleSliderChange(key as any, v[0])}
                                    max={20}
                                    step={1}
                                />
                            </div>
                        ))}
                        
                        <SeparatorHorizontal className="my-4" />
                        <p className="font-medium text-sm text-muted-foreground">Estadísticas Finales</p>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <StatDisplay label="Control del Balón" value={finalStats.ballControl} baseValueProp="baseBallControl" />
                            <StatDisplay label="Regate" value={finalStats.dribbling} baseValueProp="baseDribbling" />
                            <StatDisplay label="Posesión Estrecha" value={finalStats.tightPossession} baseValueProp="baseTightPossession" />
                            
                            <StatDisplay label="Pase Raso" value={finalStats.lowPass} baseValueProp="baseLowPass" />
                            <StatDisplay label="Pase Bombeado" value={finalStats.loftedPass} baseValueProp="baseLoftedPass" />

                            <StatDisplay label="Finalización" value={finalStats.finishing} baseValueProp="baseFinishing" />
                            <StatDisplay label="Balón Parado" value={finalStats.placeKicking} baseValueProp="basePlaceKicking" />
                            <StatDisplay label="Efecto" value={finalStats.curl} baseValueProp="baseCurl" />
                        </div>
                     </>
                )}


            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
          <Button onClick={handleSave} disabled={isPotw}>Guardar Build de {position}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
