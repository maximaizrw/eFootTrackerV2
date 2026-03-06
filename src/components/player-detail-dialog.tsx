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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Dumbbell } from "lucide-react";
import { calculateProgressionStats, statLabels, cn } from "@/lib/utils";

type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, position: Position, build: PlayerBuild, totalProgressionPoints?: number) => void;
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
  const [totalProgressionPoints, setTotalProgressionPoints] = React.useState<number | undefined>(undefined);

  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';

  const baseStats = React.useMemo(() => card?.attributeStats || {}, [card?.attributeStats]);

  React.useEffect(() => {
    if (open && flatPlayer && position && card) {
      setBuild(card.buildsByPosition?.[position] || {});
      setTotalProgressionPoints(card.totalProgressionPoints);
    }
  }, [open, flatPlayer, card, position]);

  const finalStats = React.useMemo(() => {
    if (!card || !position) return {};
    return calculateProgressionStats(baseStats, build, isGoalkeeper);
  }, [build, baseStats, card, position, isGoalkeeper]);

  const handleSave = () => {
    if (player && card && position) {
      onSavePlayerBuild(player.id, card.id, position, { ...build, updatedAt: new Date().toISOString() }, totalProgressionPoints);
      onOpenChange(false);
    }
  };

  const handleSliderChange = (category: string, value: number) => {
    setBuild(prev => ({ ...prev, [category]: value }));
  }

  const StatDisplay = ({ label, value, baseValue }: { label: string; value?: number; baseValue?: number }) => {
    if (value === undefined || value === 0) return null;
    const isIncreased = value > (baseValue || 0);
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-bold", isIncreased && "text-primary")}>{value}</span>
        </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-accent" /> Entrenamiento de {player?.name} en {position}</DialogTitle>
          <DialogDescription>Distribuye los puntos de progresión manualmente para ajustar las estadísticas.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden mt-4">
            <ScrollArea className="pr-4">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>Puntos de Progresión Totales</Label>
                        <Input type="number" value={totalProgressionPoints || ''} onChange={(e) => setTotalProgressionPoints(e.target.value ? parseInt(e.target.value, 10) : undefined)} />
                    </div>
                    {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                        <div key={key} className="space-y-2">
                            <Label className="flex items-center gap-2"><Icon className="w-4 h-4" /> {label}: <span className="font-bold text-primary">{(build as any)[key] || 0}</span></Label>
                            <Slider value={[(build as any)[key] || 0]} onValueChange={(v) => handleSliderChange(key, v[0])} max={16} step={1} />
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <ScrollArea className="md:border-l md:pl-8">
                <p className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-widest">Estadísticas Proyectadas</p>
                <div className="space-y-4">
                    {Object.entries(statLabels).map(([key, label]) => (
                        <StatDisplay key={key} label={label} value={(finalStats as any)[key]} baseValue={(baseStats as any)[`base${key.charAt(0).toUpperCase()}${key.slice(1)}`] || (baseStats as any)[key]} />
                    ))}
                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4 border-t mt-4">
          <Button onClick={handleSave}>Guardar Entrenamiento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
